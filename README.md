# Tim Hope - Portfolio

A static portfolio website for lighting and video design work, built with [11ty](https://www.11ty.dev/).

## Getting Started

### Prerequisites
- Node.js (v18 or higher)

### Installation

```bash
npm install
```

### Development

Start the development server:

```bash
npm start
```

The site will be available at `http://localhost:8080`

### Build

Generate the static site:

```bash
npm run build
```

The built site will be in the `_site` directory.

## Adding Content

### Gallery Images

1. Add your images to `src/images/`
2. Update `src/_data/gallery.json` with image details:

```json
{
  "filename": "your-image.jpg",
  "alt": "Description of the image",
  "production": "Production Name",
  "credit": "Photo by Photographer Name"
}
```

### Bio

Edit `src/_data/site.json` to update your name, title, and bio.

### CV

Add productions to `src/_data/cv.json`:

```json
{
  "year": "2024",
  "production": "Production Name",
  "venue": "Venue Name",
  "director": "Director Name",
  "choreographer": "Choreographer Name"
}
```

Note: The `choreographer` field is optional.

## Deployment

### GitHub Pages

1. Push your code to GitHub
2. Enable GitHub Pages in repository settings
3. Set source to "GitHub Actions"
4. The site will automatically deploy on push to `main`

### Cloudflare Pages

1. Connect your GitHub repository to Cloudflare Pages
2. Set build command: `npm run build`
3. Set build output directory: `_site`
4. Deploy

## Project Structure

```
├── .github/workflows/    # GitHub Actions for deployment
├── src/
│   ├── _data/           # Data files (JSON)
│   │   ├── site.json    # Site metadata and bio
│   │   ├── gallery.json # Gallery images
│   │   └── cv.json      # CV entries
│   ├── css/             # Stylesheets
│   ├── images/          # Gallery images
│   └── index.html       # Main template
├── .eleventy.js         # 11ty configuration
└── package.json         # Dependencies
```

## License

MIT
