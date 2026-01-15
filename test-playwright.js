const { webkit } = require('playwright');

(async () => {
  try {
    console.log('Testing WebKit installation...');
    const browser = await webkit.launch({ headless: false });
    console.log('Success! WebKit is working.');
    await browser.close();
    process.exit(0);
  } catch (error) {
    console.error('Error:', error.message);
    process.exit(1);
  }
})();
