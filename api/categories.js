export default function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const categories = [
    {
      id: 1,
      name: 'Peixe',
      description: 'Pratos principais de peixe fresco',
      icon: '🐟',
      sortOrder: 1
    },
    {
      id: 2,
      name: 'Marisco',
      description: 'Mariscos frescos do Atlântico',
      icon: '🦐',
      sortOrder: 2
    },
    {
      id: 3,
      name: 'Bebidas',
      description: 'Bebidas típicas portuguesas',
      icon: '🍷',
      sortOrder: 3
    },
    {
      id: 4,
      name: 'Sobremesas',
      description: 'Doces tradicionais portugueses',
      icon: '🍮',
      sortOrder: 4
    },
    {
      id: 5,
      name: 'Entradas',
      description: 'Aperitivos e entradas',
      icon: '🥗',
      sortOrder: 0
    }
  ];

  res.status(200).json({
    success: true,
    data: categories,
    timestamp: new Date().toISOString()
  });
}