
import fs from 'fs';
import path from 'path';

const BACKUP_PATH = 'd:\\tasca_backup_2026-02-10.json';
const OUTPUT_PATH = path.resolve(process.cwd(), 'migration_data.json');

try {
    console.log(`Reading backup from ${BACKUP_PATH}...`);
    const raw = fs.readFileSync(BACKUP_PATH, 'utf8');
    const data = JSON.parse(raw);
    const state = data.state;

    console.log('Extracting categories...');
    const categories = (state.categories || []).map((c: any) => ({
        id: c.id,
        name: c.name,
        icon: c.icon,
        visible: true // Default, as not present in backup
    }));

    console.log('Extracting dishes...');
    const dishes = (state.menu || []).map((d: any) => ({
        id: d.id,
        name: d.name,
        description: d.description || '',
        price: d.price ? d.price / 1000 : 0, // Convert 2500 -> 2.50
        category_id: d.categoryId,
        image_url: d.image || '',
        is_visible_digital: d.isAvailableOnDigitalMenu !== false, // Default true
        is_featured: false
    }));

    console.log('Extracting orders...');
    const orders = (state.activeOrders || []).map((o: any) => ({
        id: o.id,
        table_id: o.tableId,
        status: o.status,
        total: o.total ? o.total / 1000 : 0,
        items: o.items || [], // Keep internal structure as is for JSONB
        created_at: o.timestamp || new Date().toISOString()
    }));

    const migrationData = {
        categories,
        dishes,
        orders
    };

    console.log(`Writing ${categories.length} categories, ${dishes.length} dishes, ${orders.length} orders to ${OUTPUT_PATH}...`);
    fs.writeFileSync(OUTPUT_PATH, JSON.stringify(migrationData, null, 2), 'utf8');
    console.log('Done!');

} catch (error) {
    console.error('Error extracting backup:', error);
    process.exit(1);
}
