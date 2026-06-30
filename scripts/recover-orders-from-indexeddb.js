// ============================================================
// SCRIPT DE RECUPERAÇÃO DE ORDENS DO INDEXEDDB
// 
// COMO USAR:
// 1. Abrir a app no browser (NÃO fazer refresh primeiro!)
// 2. Abrir DevTools (F12) → Console
// 3. Colar este script inteiro e pressionar Enter
// 4. Se encontrar ordens com items, vai aparecer um botão para download
// ============================================================

(async function() {
  const DB_NAME = 'tasca_vereda_backup_db';
  const STORE_NAME = 'active_orders_backup';

  console.log('🔍 A procurar backup no IndexedDB...');

  try {
    const request = indexedDB.open(DB_NAME, 1);

    request.onerror = () => {
      console.error('❌ Erro ao abrir IndexedDB:', request.error);
      return;
    };

    request.onsuccess = async (event) => {
      const db = event.target.result;

      if (!db.objectStoreNames.contains(STORE_NAME)) {
        console.log('❌ Store "active_orders_backup" não encontrado no IndexedDB');
        console.log('Stores disponíveis:', Array.from(db.objectStoreNames));
        return;
      }

      const tx = db.transaction(STORE_NAME, 'readonly');
      const store = tx.objectStore(STORE_NAME);
      const getAll = store.getAll();

      getAll.onsuccess = () => {
        const results = getAll.result;

        if (!results || results.length === 0) {
          console.log('❌ Nenhum backup encontrado no IndexedDB');
          return;
        }

        console.log('📦 Backups encontrados:', results.length);

        results.forEach((backup, idx) => {
          console.log(`\n--- Backup ${idx + 1} ---`);
          console.log('ID:', backup.id);
          console.log('Timestamp:', backup.timestamp);
          console.log('Hash:', backup.hash);
          console.log('Total de ordens:', backup.orders?.length || 0);

          if (backup.orders && backup.orders.length > 0) {
            let ordersWithItems = 0;
            let totalItems = 0;

            backup.orders.forEach(order => {
              const itemCount = order.items?.length || 0;
              if (itemCount > 0) ordersWithItems++;
              totalItems += itemCount;

              console.log(
                `  Mesa ${order.tableId} | Order: ${order.id?.slice(0, 12)}... | ` +
                `Status: ${order.status} | Total: ${order.total} Kz | ` +
                `Items: ${itemCount}` +
                (itemCount > 0 ? ' | Produtos: ' + order.items.map(i => 
                  i.dish?.name || i.name || i.dishId?.slice(0, 8) || '?'
                ).join(', ') : '')
              );
            });

            console.log(`\n✅ Ordens COM items: ${ordersWithItems} de ${backup.orders.length}`);
            console.log(`✅ Total de items encontrados: ${totalItems}`);

            if (ordersWithItems > 0) {
              // Exportar para ficheiro JSON
              const json = JSON.stringify(backup.orders, null, 2);
              const blob = new Blob([json], { type: 'application/json' });
              const url = URL.createObjectURL(blob);
              const a = document.createElement('a');
              a.href = url;
              a.download = `orders-backup-${backup.timestamp?.slice(0, 19)?.replace(/[:.]/g, '-') || 'unknown'}.json`;
              document.body.appendChild(a);
              a.click();
              document.body.removeChild(a);
              URL.revokeObjectURL(url);
              console.log('💾 Ficheiro descarregado com as ordens!');
            } else {
              console.log('⚠️ Nenhuma ordem tem items neste backup');
            }
          }
        });

        // Também verificar o localStorage
        console.log('\n🔍 A verificar localStorage...');

        // vereda-store (Zustand persist)
        const zustandState = localStorage.getItem('vereda-store');
        if (zustandState) {
          try {
            const parsed = JSON.parse(zustandState);
            const activeOrders = parsed?.state?.activeOrders || [];
            console.log(`📦 vereda-store: ${activeOrders.length} ordens ativas`);

            let zustandWithItems = 0;
            activeOrders.forEach(order => {
              const itemCount = order.items?.length || 0;
              if (itemCount > 0) zustandWithItems++;
              console.log(
                `  Mesa ${order.tableId} | Order: ${order.id?.slice(0, 12)}... | ` +
                `Total: ${order.total} Kz | Items: ${itemCount}` +
                (itemCount > 0 ? ' | Produtos: ' + order.items.map(i => 
                  i.dish?.name || i.name || i.dishId?.slice(0, 8) || '?'
                ).join(', ') : '')
              );
            });

            if (zustandWithItems > 0) {
              console.log(`\n🎉 ENCONTRADO! ${zustandWithItems} ordens com items no localStorage (vereda-store)!`);
              
              // Exportar
              const json = JSON.stringify(activeOrders, null, 2);
              const blob = new Blob([json], { type: 'application/json' });
              const url = URL.createObjectURL(blob);
              const a = document.createElement('a');
              a.href = url;
              a.download = 'orders-zustand-backup.json';
              document.body.appendChild(a);
              a.click();
              document.body.removeChild(a);
              URL.revokeObjectURL(url);
              console.log('💾 Ficheiro descarregado: orders-zustand-backup.json');
            } else {
              console.log('⚠️ Nenhuma ordem com items no vereda-store');
            }
          } catch (e) {
            console.log('⚠️ Erro ao parse vereda-store:', e.message);
          }
        } else {
          console.log('⚠️ vereda-store não encontrado no localStorage');
        }

        // active_orders_backup_v1
        const backupV1 = localStorage.getItem('active_orders_backup_v1');
        if (backupV1) {
          try {
            const parsed = JSON.parse(backupV1);
            const orders = Array.isArray(parsed) ? parsed : (parsed.orders || []);
            let v1WithItems = 0;
            orders.forEach(order => {
              if (order.items?.length > 0) v1WithItems++;
            });
            console.log(`\n📦 active_orders_backup_v1: ${orders.length} ordens, ${v1WithItems} com items`);
            
            if (v1WithItems > 0) {
              console.log(`🎉 ENCONTRADO! ${v1WithItems} ordens com items no active_orders_backup_v1!`);
              const json = JSON.stringify(orders, null, 2);
              const blob = new Blob([json], { type: 'application/json' });
              const url = URL.createObjectURL(blob);
              const a = document.createElement('a');
              a.href = url;
              a.download = 'orders-backup-v1.json';
              document.body.appendChild(a);
              a.click();
              document.body.removeChild(a);
              URL.revokeObjectURL(url);
              console.log('💾 Ficheiro descarregado: orders-backup-v1.json');
            }
          } catch (e) {
            console.log('⚠️ Erro ao parse active_orders_backup_v1:', e.message);
          }
        }

        // vereda_closed_orders_backup
        const closedBackup = localStorage.getItem('vereda_closed_orders_backup');
        if (closedBackup) {
          try {
            const parsed = JSON.parse(closedBackup);
            let closedWithItems = 0;
            parsed.forEach(order => {
              if (order.items?.length > 0) closedWithItems++;
            });
            console.log(`\n📦 vereda_closed_orders_backup: ${parsed.length} ordens fechadas, ${closedWithItems} com items`);
          } catch (e) {
            console.log('⚠️ Erro ao parse vereda_closed_orders_backup:', e.message);
          }
        }
      };

      getAll.onerror = () => {
        console.error('❌ Erro ao ler backup:', getAll.error);
      };
    };

    request.onupgradeneeded = (event) => {
      console.log('⚠️ IndexedDB precisou de upgrade - pode não ter dados');
    };

  } catch (err) {
    console.error('❌ Erro geral:', err);
  }
})();
