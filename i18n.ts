
import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';

const resources = {
  pt: {
    translation: {
      "dashboard": "Painel de Controlo",
      "pos": "Ponto de Venda",
      "kitchen": "Cozinha (KDS)",
      "reservations": "Reservas",
      "loyalty": "Fidelidade",
      "tables": "Mesas",
      "orders": "Pedidos",
      "welcome": "Bem-vindo à Tasca Do VEREDA",
      "total_sales": "Vendas Totais",
      "active_orders": "Pedidos Ativos",
      "occupied_tables": "Mesas Ocupadas",
      "ai_insights": "Insights da IA",
      "currency": "Kz",
      "ask_ai": "Consultar Chef IA",
    }
  }
};

i18n
  .use(initReactI18next)
  .init({
    resources,
    lng: "pt",
    interpolation: {
      escapeValue: false
    }
  });

export default i18n;
