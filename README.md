# FormPilot Tracking Script

Privacy-first form analytics tracking script.

## Installation

### Via CDN (Recommended)

```html
<script
  src="https://cdn.formpilot.dev/script.js"
  data-formpilot="YOUR_PROJECT_PUBLIC_KEY"
></script>
```

### With Debug Mode

```html
<script
  src="https://cdn.formpilot.dev/script.js"
  data-formpilot="YOUR_PROJECT_PUBLIC_KEY"
  data-debug
></script>
```

### Manual Installation

```html
<script src="/path/to/formpilot.min.js"></script>
<script>
  new FormPilot({
    project_key: 'YOUR_PROJECT_PUBLIC_KEY',
    api_url: 'https://your-api.com/api/formpilot/events',
    batch_size: 10,
    batch_interval: 5000,
    debug: false
  });
</script>
```

## Features

- **Privacy-First**: No field values captured, only metadata
- **Lightweight**: ~5KB gzipped
- **Automatic Tracking**: Focus, blur, submit, abandon events
- **Offline Support**: Events stored in localStorage
- **Batch Processing**: Efficient API calls
- **Reliable Delivery**: Uses `sendBeacon` for page unload

## Development

### Build

```bash
npm install
npm run build
```

### Watch Mode

```bash
npm run dev
```

### Test

```bash
npm test
```

## Event Types

- `focus`: User focuses on a field
- `blur`: User leaves a field (includes time spent)
- `submit`: Form submitted
- `abandon`: User leaves without submitting
- `error`: Field validation error

## Configuration Options

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `project_key` | string | required | Your project public key |
| `api_url` | string | `https://formpilot.dev/api/formpilot/events` | API endpoint |
| `batch_size` | number | `10` | Events per batch |
| `batch_interval` | number | `5000` | Batch interval (ms) |
| `debug` | boolean | `false` | Enable debug logging |

## Browser Support

- Chrome/Edge 90+
- Firefox 88+
- Safari 14+
- Opera 76+

## License

MIT
