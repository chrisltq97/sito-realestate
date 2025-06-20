# SITO Real Estate Platform

A modern real estate platform for Costa Rica, featuring interactive maps, property listings, and advanced search capabilities.

## Features

- Interactive property map
- Advanced property search
- User authentication
- Property listings with detailed information
- Contact forms for inquiries
- GIS integration for property boundaries

## Tech Stack

- Frontend: HTML, CSS, JavaScript
- Backend: Node.js, Express
- Database: Supabase
- Maps: MapBox
- Authentication: Supabase Auth

## Local Development Setup

1. Clone the repository:
   ```bash
   git clone https://github.com/chrisltq97/sito-realestate.git
   cd sito-realestate
   ```

2. Install dependencies:
   ```bash
   npm install
   cd backend
   npm install
   ```

3. Create a `.env` file in the backend directory with your credentials:
   ```
   SUPABASE_URL=your_supabase_url
   SUPABASE_KEY=your_supabase_key
   MAPBOX_TOKEN=your_mapbox_token
   ```

4. Start the development server:
   ```bash
   # In the backend directory
   npm run dev
   ```

5. Open `http://localhost:3000` in your browser

## Deployment

The project is configured for deployment on Vercel:

1. Install Vercel CLI:
   ```bash
   npm install -g vercel
   ```

2. Deploy:
   ```bash
   vercel
   ```

3. Follow the prompts to deploy your project

## Data Files

Some large data files are not included in the repository due to size limitations:
- Property GeoJSON files
- Cleaned property data
- Database journal files

These files need to be generated using the scripts in the `scripts` directory or obtained from the data source.

## Scripts

- `npm run dev`: Start development server
- `npm run seed`: Seed the database with initial data
- `npm start`: Start production server

## Contributing

1. Fork the repository
2. Create your feature branch
3. Commit your changes
4. Push to the branch
5. Create a Pull Request

## License

This project is licensed under the MIT License.

<!-- Force redeploy -->

## Contact

Your Name - your.email@example.com
Project Link: https://github.com/yourusername/sito-realestate 