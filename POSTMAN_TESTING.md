# Testing Screenshot API with Postman

## API Endpoint
- **URL**: `http://localhost:3000/api/screenshot`
- **Method**: `POST`
- **Content-Type**: `application/json`

## Test Request

### 1. Basic POST Request

**Headers:**
```
Content-Type: application/json
```

**Body (JSON):**
```json
{
  "screenshot": "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==",
  "pageUrl": "https://www.example.com",
  "pageTitle": "Example Domain",
  "selectedText": "This is some selected text from the page",
  "timestamp": 1733097600000
}
```

**Expected Response (200 OK):**
```json
{
  "success": true,
  "message": "Screenshot received successfully",
  "data": {
    "pageTitle": "Example Domain",
    "pageUrl": "https://www.example.com",
    "selectedText": "This is some selected text from the page",
    "timestamp": 1733097600000,
    "screenshotSize": 109
  }
}
```

---

### 2. Minimal Request (Required Fields Only)

**Body (JSON):**
```json
{
  "screenshot": "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==",
  "pageUrl": "https://www.google.com",
  "pageTitle": "Google"
}
```

**Expected Response (200 OK):**
```json
{
  "success": true,
  "message": "Screenshot received successfully",
  "data": {
    "pageTitle": "Google",
    "pageUrl": "https://www.google.com",
    "timestamp": 1733097600000,
    "screenshotSize": 109
  }
}
```

---

### 3. Error Test - Missing Required Field

**Body (JSON):**
```json
{
  "pageUrl": "https://www.example.com",
  "pageTitle": "Example Domain"
}
```

**Expected Response (400 Bad Request):**
```json
{
  "error": "Missing required fields: screenshot, pageUrl, or pageTitle"
}
```

---

### 4. Error Test - Invalid Screenshot Format

**Body (JSON):**
```json
{
  "screenshot": "not-a-valid-data-url",
  "pageUrl": "https://www.example.com",
  "pageTitle": "Example Domain"
}
```

**Expected Response (400 Bad Request):**
```json
{
  "error": "Invalid screenshot format. Expected data URL."
}
```

---

### 5. GET Request (API Info)

**Method:** `GET`  
**URL:** `http://localhost:3000/api/screenshot`

**Expected Response (200 OK):**
```json
{
  "message": "Screenshot API endpoint",
  "methods": ["POST"],
  "postBody": {
    "screenshot": "data:image/png;base64,...",
    "pageUrl": "https://example.com",
    "pageTitle": "Page Title",
    "selectedText": "Optional selected text",
    "timestamp": "Unix timestamp"
  }
}
```

---

## Postman Setup Steps

### Step 1: Create New Request
1. Open Postman
2. Click **"New"** → **"HTTP Request"**
3. Name it: **"Screenshot API - POST"**

### Step 2: Configure Request
1. **Method**: Select `POST`
2. **URL**: Enter `http://localhost:3000/api/screenshot`
3. Go to **Headers** tab
4. Add header:
   - Key: `Content-Type`
   - Value: `application/json`

### Step 3: Add Request Body
1. Go to **Body** tab
2. Select **"raw"**
3. Select **"JSON"** from dropdown
4. Paste the test JSON from example #1 above

### Step 4: Send Request
1. Make sure your Next.js app is running (`npm run dev`)
2. Click **"Send"** button
3. Check the response in the bottom panel

### Step 5: Check Server Console
1. Open your Next.js terminal
2. You should see: `📸 Screenshot received:` with details

---

## Using a Real Screenshot

To test with an actual screenshot data URL:

1. **Capture a small screenshot:**
   - Open browser DevTools (F12)
   - Go to Console tab
   - Run this code:
   ```javascript
   const canvas = document.createElement('canvas');
   canvas.width = 100;
   canvas.height = 100;
   const ctx = canvas.getContext('2d');
   ctx.fillStyle = '#3b82f6';
   ctx.fillRect(0, 0, 100, 100);
   ctx.fillStyle = 'white';
   ctx.font = '20px Arial';
   ctx.fillText('Test', 20, 50);
   console.log(canvas.toDataURL('image/png'));
   ```

2. **Copy the output** (starts with `data:image/png;base64,`)

3. **Replace the screenshot value** in Postman with this data URL

4. **Send the request**

---

## Testing Error Cases

### Test 1: Missing Screenshot
```json
{
  "pageUrl": "https://www.example.com",
  "pageTitle": "Example"
}
```
**Expected:** 400 error

### Test 2: Missing Page URL
```json
{
  "screenshot": "data:image/png;base64,iVBORw0KGg...",
  "pageTitle": "Example"
}
```
**Expected:** 400 error

### Test 3: Invalid Data URL
```json
{
  "screenshot": "invalid",
  "pageUrl": "https://www.example.com",
  "pageTitle": "Example"
}
```
**Expected:** 400 error

---

## CORS Testing (if needed)

If testing from a different origin:

**Add to `route.ts`:**
```typescript
export async function OPTIONS(request: NextRequest) {
  return new NextResponse(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, GET, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    },
  });
}
```

---

## Monitoring

### Check Server Logs
When a screenshot is received, you'll see in terminal:
```
📸 Screenshot received: {
  pageTitle: 'Example Domain',
  pageUrl: 'https://www.example.com',
  hasSelectedText: true,
  timestamp: '2025-12-02T10:30:00.000Z',
  screenshotSize: 12345
}
```

### Verify Response
- Status: `200 OK`
- Body contains: `"success": true`
- Data includes all submitted fields

---

## Tips

1. **Keep screenshot data small** for testing (use 1x1 pixel image)
2. **Check Content-Type header** is set correctly
3. **Ensure Next.js is running** on port 3000
4. **View console logs** in VS Code terminal to verify receipt
5. **Save requests** in Postman collection for reuse
