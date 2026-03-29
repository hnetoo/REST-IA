export default function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // Mock data for menu items
  const menuItems = [
    {
      id: 1,
      name: 'Bacalhau à Brás',
      description: 'Bacalhau desfiado com batata palha e ovos mexidos',
      price: 14.50,
      category: 'Peixe',
      image: '/images/bacalhau-bras.jpg',
      available: true
    },
    {
      id: 2,
      name: 'Caldeirada de Peixe',
      description: 'Ensopado de peixe fresco com batatas e legumes',
      price: 18.00,
      category: 'Peixe',
      image: '/images/caldeirada.jpg',
      available: true
    },
    {
      id: 3,
      name: 'Cataplana de Marisco',
      description: 'Mariscos frescos cozidos na cataplana com arroz',
      price: 22.00,
      category: 'Marisco',
      image: '/images/cataplana.jpg',
      available: true
    },
    {
      id: 4,
      name: 'Sardinhas Assadas',
      description: 'Sardinhas frescas grelhadas com pão e salada',
      price: 12.00,
      category: 'Peixe',
      image: '/images/sardinhas.jpg',
      available: true
    },
    {
      id: 5,
      name: 'Arroz de Tamboril',
      description: 'Arroz cremoso com tamboril e legumes',
      price: 16.50,
      category: 'Peixe',
      image: '/images/arroz-tamboril.jpg',
      available: true
    },
    {
      id: 6,
      name: 'Polvo à Lagareiro',
      description: 'Polvo cozido no forno com batatas e azeite',
      price: 19.00,
      category: 'Peixe',
      image: '/images/polvo-lagareiro.jpg',
      available: true
    },
    {
      id: 7,
      name: 'Vinho Verde',
      description: 'Vinho verde português fresco e leve',
      price: 4.50,
      category: 'Bebidas',
      image: '/images/vinho-verde.jpg',
      available: true
    },
    {
      id: 8,
      name: 'Sagres',
      description: 'Cerveja portuguesa tradicional',
      price: 2.50,
      category: 'Bebidas',
      image: '/images/sagres.jpg',
      available: true
    }
  ];

  res.status(200).json({
    success: true,
    data: menuItems,
    timestamp: new Date().toISOString()
  });
}