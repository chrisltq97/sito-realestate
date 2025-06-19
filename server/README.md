# Real Estate Backend (Node.js + Supabase)

## Setup

1. **Install dependencies:**
   ```bash
   npm install
   ```

2. **Configure environment:**
   - Copy `.env.example` to `.env` and fill in your Supabase project details and bucket name.

3. **Run the server:**
   ```bash
   npm start
   ```

## API Endpoints

- `GET    /api/properties`         — List all properties
- `GET    /api/properties/:id`     — Get property by ID
- `POST   /api/properties`         — Create property (JSON body)
- `PUT    /api/properties/:id`     — Update property (JSON body)
- `DELETE /api/properties/:id`     — Delete property
- `POST   /api/upload`             — Upload image (form-data, field: `image`)

## Notes
- Images are uploaded to Supabase Storage and return a public URL.
- All property data is stored in your Supabase Postgres table. 