export default function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const restaurantInfo = {
    name: 'Tasca do Vereda',
    description: 'Autêntica tasca portuguesa com os melhores sabores do mar',
    address: 'Rua do Vereda, 123, Lisboa',
    phone: '+351 21 123 4567',
    email: 'info@tascadovereda.pt',
    website: 'https://tasca-do-vereda.vercel.app',
    openingHours: {
      'Segunda': '12:00 - 15:00, 19:00 - 22:00',
      'Terça': '12:00 - 15:00, 19:00 - 22:00',
      'Quarta': '12:00 - 15:00, 19:00 - 22:00',
      'Quinta': '12:00 - 15:00, 19:00 - 22:00',
      'Sexta': '12:00 - 15:00, 19:00 - 23:00',
      'Sábado': '12:00 - 15:00, 19:00 - 23:00',
      'Domingo': '12:00 - 15:00, 19:00 - 22:00'
    },
    socialMedia: {
      instagram: '@tascadovereda',
      facebook: 'tascadovereda'
    },
    features: [
      'Wi-Fi Grátis',
      'Reservas',
      'Takeaway',
      'Esplanada',
      'Estacionamento',
      'Acessível'
    ],
    paymentMethods: [
      'Multibanco',
      'Visa',
      'Mastercard',
      'MB Way',
      'Dinheiro'
    ],
    logo: '/logo.png',
    theme: {
      primaryColor: '#1e40af',
      secondaryColor: '#f59e0b',
      backgroundColor: '#ffffff'
    }
  };

  res.status(200).json({
    success: true,
    data: restaurantInfo,
    timestamp: new Date().toISOString()
  });
}