# Relatorio de Auditoria de Performance
## REST-IA (Tasca do Vereda) — App em Producao

**Data:** 2026-06-04  
**Auditor:** Analise Senior de Performance  
**Deploy atual:** https://rest-ia.vercel.app

---

## 1. DIAGNOSTICO DO BUNDLE

```
Bundle principal (index-DVVLCgdV.js): 2,879.86 KB (675 KB gzip)
CSS (index-D_H92Od9.css):             87.80 KB (13.5 KB gzip)
Outros chunks:                          ~400 KB
TOTAL:                                  ~3.4 MB carregado (~700 KB gzip)
```

**Benchmark:**
| Metrica | Atual | Recomendado | Status |
|---------|-------|-------------|--------|
| Bundle JS | 2.88 MB | < 1 MB | ❌ MUITO ALTO |
| CSS | 88 KB | < 50 KB | ⚠️ Aceitavel |
| First Load | ~3-5s (3G) | < 2s | ❌ LENTO |

---

## 2. PROBLEMAS CRITICOS ENCONTRADOS

### 🔴 PROBLEMA 1: App.tsx carrega TUDO de uma vez (RISCO: CRITICO)

**App.tsx (web)** importa estaticamente 20+ componentes:
```typescript
import DashboardV2 from './src/views/DashboardV2';
import POS from './src/views/POS';
import Finance from './src/views/Finance';
import Analytics from './src/views/Analytics';
import Reports from './src/views/Reports';
import Employees from './src/views/Employees';
import SystemHub from './src/views/SystemHub';
// ... etc (20+ imports)
```

**App_tauri.tsx (desktop)** já usa lazy loading corretamente:
```typescript
const POS = lazy(() => import('./views/POS'));
const SystemHub = lazy(() => import('./views/SystemHub'));
const Finance = lazy(() => import('./views/Finance'));
// ... etc
```

**Impacto:** Usuario que so quer fazer login carrega 2.88 MB de codigo de Analytics, Reports, Employees, etc. que nao vai usar.

**Ganho estimado:** Reduzir bundle inicial de 2.88 MB para ~800 KB (carregando apenas Login + Dashboard + Sidebar).

---

### 🔴 PROBLEMA 2: Recharts importado inteiro (RISCO: ALTO)

**DashboardV2.tsx**:
```typescript
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, AreaChart, Area, LineChart, Line } from 'recharts';
```

Isso importa a BIBLIOTECA INTEIRA (150 KB+), mesmo que DashboardV2 seja lazy-loaded.

**Ganho estimado:** Code-split recharts para carregar so quando DashboardV2 for acessado.

---

### 🟡 PROBLEMA 3: html2canvas + jspdf sempre no bundle (RISCO: MEDIO)

```
html2canvas.esm-CBrSDip1.js       201.42 kB (48 KB gzip)
purify.es-B5CD4DQe.js             22.90 kB  (9 KB gzip)
```

Usados apenas para exportar relatorios PDF. Usuario que nunca abre "Relatorios" carrega 200 KB+ de pdf/ canvas.

**Ganho estimado:** Lazy-load html2canvas e jspdf so quando usuario clicar em "Exportar PDF".

---

### 🟡 PROBLEMA 4: @google/genai sempre carregado (RISCO: MEDIO)

`@google/genai` esta nas dependencies e pode estar sendo incluido no bundle principal.

Usado apenas em:
- `geminiService.ts` (recomendacoes de menu)
- `Analytics.tsx` (analise de performance)

**Ganho estimado:** Carregar geminiService dinamicamente so quando IA for acionada.

---

### 🟢 PROBLEMA 5: Dependencias de Tauri no bundle web (RISCO: BAIXO)

```
@tauri-apps/api          ^2.10.1
@tauri-apps/plugin-*       ^2.1.0
```

Toda a API do Tauri esta no package.json. Se for importada no bundle web, adiciona peso desnecessario.

---

## 3. PLANO DE OTIMIZACAO

### FASE A: Lazy Loading no App.tsx (RISCO: ZERO — ja funciona no App_tauri)

Copiar a estrategia do App_tauri.tsx para App.tsx.

**Componentes que DEVEM ser lazy-loaded:**
| Componente | Tamanho estimado | Justificativa |
|------------|-----------------|---------------|
| DashboardV2 | 35 KB | Principal, mas pode lazy |
| POS | 30 KB | Usado so em vendas |
| Finance | 49 KB | Usado so em financeiro |
| Analytics | 24 KB | Usado so em analytics |
| Reports | 43 KB | Usado so em relatorios |
| Employees | 45 KB | Usado so em RH |
| SystemHub | ~20 KB | Usado so em sistema |
| Events | ~15 KB | Usado so em eventos |
| Reservations | ~20 KB | Usado so em reservas |
| TableLayout | 28 KB | Usado so em mesas |
| Inventory | ~15 KB | Usado so em stock |
| Purchases | 30 KB | Usado so em compras |
| ProfitCenter | 22 KB | Usado so em lucros |
| AGTControl | 19 KB | Usado so em AGT |
| CertificationDashboard | 15 KB | Usado so em certificacao |
| ComplianceReports | 20 KB | Usado so em compliance |
| CustomerDisplay | 23 KB | Usado so em display |
| PublicMenu | 21 KB | Usado so em menu publico |

**Componentes que DEVEM manter import direto (leves/criticos):**
| Componente | Justificativa |
|------------|--------------|
| Login | Primeira tela — deve ser instantanea |
| OwnerLogin | Login rapido |
| OwnerDashboard | Tela principal do dono |
| Sidebar | Sempre visivel |
| ApprovePurchase | Rota publica de aprovacao |
| PrinterConfig | Leve, usado frequentemente |

**Ganho estimado:** Bundle inicial de 2.88 MB → ~800 KB (72% menor!)

---

### FASE B: Tree-shaking Recharts (RISCO: BAIXO)

Atual:
```typescript
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, AreaChart, Area, LineChart, Line } from 'recharts';
```

Melhor (tree-shaking individual):
```typescript
import { BarChart } from 'recharts/es6/chart/BarChart';
import { Bar } from 'recharts/es6/cartesian/Bar';
// etc
```

**Ganho estimado:** ~30-50 KB a menos no chunk do Dashboard.

---

### FASE C: Lazy-load html2canvas + jspdf (RISCO: BAIXO)

Atual (import estatico no printService):
```typescript
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';
```

Melhor (dynamic import):
```typescript
const { default: html2canvas } = await import('html2canvas');
const { default: jsPDF } = await import('jspdf');
```

**Ganho estimado:** 200 KB+ removidos do bundle inicial.

---

### FASE D: Lazy-load geminiService (RISCO: BAIXO)

Atual (import estatico):
```typescript
import { getChefRecommendation } from '../lib/geminiService';
```

Melhor (dynamic import):
```typescript
const { getChefRecommendation } = await import('../lib/geminiService');
```

**Ganho estimado:** ~50 KB removidos (depende do tamanho da lib genai).

---

### FASE E: Analisar @tauri-apps no bundle web (RISCO: ZERO)

Verificar se `@tauri-apps/api` esta sendo tree-shaked do bundle web.
Se nao estiver, adicionar alias no Vite para mock/stub.

---

## 4. IMPACTO ESTIMADO TOTAL

| Otimizacao | Ganho KB (raw) | Ganho KB (gzip) | Impacto |
|------------|---------------|-----------------|---------|
| Lazy loading App.tsx | -2,000 KB | -500 KB | 🔴 CRITICO |
| Lazy html2canvas/jspdf | -200 KB | -50 KB | 🟡 MEDIO |
| Lazy geminiService | -50 KB | -15 KB | 🟢 BAIXO |
| Tree-shake recharts | -30 KB | -10 KB | 🟢 BAIXO |
| **TOTAL ESTIMADO** | **-2,280 KB** | **-575 KB** | **🔴 MASSIVO** |

**Bundle final estimado:** 2.88 MB → **~600 KB** (gzip: 675 KB → **~100 KB**)

---

## 5. CHECKLIST DE IMPLEMENTACAO

- [ ] **FASE A:** Adicionar React.lazy() + Suspense em App.tsx
- [ ] **FASE B:** Tree-shake recharts em DashboardV2.tsx
- [ ] **FASE C:** Dynamic import html2canvas/jspdf em printService.ts
- [ ] **FASE D:** Dynamic import geminiService em Analytics.tsx e outros
- [ ] **FASE E:** Verificar tauri-apps no bundle web

---

## 6. RISCOS E MITIGACOES

| Risco | Mitigacao |
|-------|-----------|
| Tela branca durante carregamento lazy | Suspense com loading spinner (ja existe no App_tauri) |
| Rota direta (URL) quebra | Fallback do Suspense mostra loader ate carregar |
| Build quebra com dynamic import | Testar cada import dinamico individualmente |

---

*Relatorio gerado em: 2026-06-04*  
*Proxima acao recomendada: Implementar FASE A (lazy loading em App.tsx)*
