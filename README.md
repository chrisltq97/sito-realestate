# SITO Real Estate Platform

A modern real estate platform for managing and displaying property listings in Costa Rica.

## Features

- Interactive property map with real-time filtering
- Active property listings with detailed information
- Property image galleries with lightbox view
- Responsive design for all devices
- Real-time property search
- Property status tracking (active/off-market)

## Tech Stack

- Frontend: Vanilla JavaScript, HTML5, CSS3
- Backend: Node.js
- Database: Supabase
- Maps: Mapbox GL JS
- Storage: Supabase Storage

## Prerequisites

- Node.js (v14 or higher)
- A Supabase account and project
- A Mapbox account and access token

## Environment Setup

1. Clone the repository:
```bash
git clone https://github.com/yourusername/sito-realestate.git
cd sito-realestate
```

2. Install dependencies:
```bash
npm install
```

3. Create a `.env` file in the root directory with your configuration:
```env
SUPABASE_URL=your_supabase_url
SUPABASE_ANON_KEY=your_supabase_anon_key
MAPBOX_ACCESS_TOKEN=your_mapbox_token
```

4. Start the development server:
```bash
npm start
```

## Project Structure

```
backend/
  ├── public/          # Static files
  │   ├── css/         # Stylesheets
  │   ├── js/          # JavaScript files
  │   ├── images/      # Image assets
  │   └── data/        # GeoJSON data files
  └── server.js        # Node.js server

```

## Database Schema

The project uses Supabase with the following main tables:

- `properties`: Base property information
- `listings`: Active property listings
- `registry_data`: Property registry information

## Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## Contact

Your Name - your.email@example.com
Project Link: https://github.com/yourusername/sito-realestate # sito-realestate
