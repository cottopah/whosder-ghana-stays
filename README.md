# Whosder Ghana Stays

A dependency-free interactive prototype for an owner-managed short-term rental portfolio in Accra, Ghana.

## Run

Open `index.html` directly, or run a local static server:

```powershell
python -m http.server 8080
```

Then visit `http://localhost:8080`.

## Included flows

- Responsive guest listing, search, property detail, date selection, and booking
- Simulated external payment handoff for cards, MTN MoMo, and Telecel Cash
- Guest account and saved booking experience
- Separate, unlinked owner console (`owner.html`) with an identity-provider gate, property CRUD, and media sync status
- `.ics`, Google Calendar, and Outlook calendar options for confirmed bookings
- Remembered Light and Dark guest themes
- Remembered GHS, USD, EUR, and GBP display currencies with a backend exchange-rate API contract
- Guest support chatbot with safety guidance and a WhatsApp handoff
- Persistent prototype data using `localStorage`
- Architecture and data-flow drawing in `architecture.svg`

## Production notes

This prototype deliberately does not store raw payment credentials. Production should use hosted payment fields and tokenization from a PCI-compliant vendor supporting Ghanaian cards and mobile money. Airbnb content should be synchronized through an authorized Airbnb API, property-management-system partner, or channel manager. Scraping listing pages is brittle and may violate platform terms.

The owner page is physically separated from the guest page and is not linked publicly. In production, obscuring a URL is not security: deploy the console separately and require server-side role authorization on every admin API call, managed identity, MFA/passkeys, short-lived HttpOnly/Secure/SameSite sessions, CSRF protection, audit logs, and rate limits. Passwords must be Argon2id-hashed; raw payment credentials must never enter application storage or logs.

For live display conversion, the guest app expects `GET /api/exchange-rates` to return USD-based rates such as `{ "rates": { "USD": 1, "GHS": 12.5, "EUR": 0.86, "GBP": 0.74 } }`. Fetch rates server-side from a dedicated FX-data provider, cache them with a timestamp, and never expose the provider key in browser code. Display rates are estimates; the payment provider's checkout quote is authoritative.

Set `WHATSAPP_NUMBER` in `support.js` to the business number in full international digits without `+`, spaces, or punctuation. Until configured, the WhatsApp button opens a contact-selection handoff with the guest's latest question prefilled. The bundled chatbot is a fast FAQ assistant, not a generative AI service; production AI should run behind a rate-limited backend with moderation, logging controls, and no access to payment credentials.
