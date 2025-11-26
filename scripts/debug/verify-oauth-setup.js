// OAuth2 Setup Verification Script
// Paste this in browser console (F12) on chrome://extensions/ page

function verifyOAuthSetup() {
    console.log("=== Chrome Extension OAuth2 Setup Verification ===");
    
    // Get all extensions
    const extensions = document.querySelectorAll('.extension-list-item-wrapper');
    let earthAgentExtension = null;
    
    extensions.forEach(ext => {
        const nameElement = ext.querySelector('.extension-title');
        if (nameElement && nameElement.textContent.includes('Earth Agent')) {
            earthAgentExtension = ext;
        }
    });
    
    if (earthAgentExtension) {
        const idElement = earthAgentExtension.querySelector('.extension-id');
        const extensionId = idElement ? idElement.textContent.replace('ID: ', '') : 'Not found';
        
        console.log("✅ Extension found!");
        console.log("📋 Extension ID:", extensionId);
        console.log("📋 Copy this ID ^^^");
        
        // Validation
        if (extensionId.length === 32 && /^[a-p]+$/.test(extensionId)) {
            console.log("✅ Extension ID format is valid");
        } else {
            console.log("❌ Extension ID format is invalid");
            console.log("   Expected: 32 lowercase letters (a-p)");
            console.log("   Got:", extensionId);
        }
        
        console.log("\n=== Next Steps ===");
        console.log("1. Copy the Extension ID above");
        console.log("2. Go to Google Cloud Console:");
        console.log("   https://console.cloud.google.com/apis/credentials");
        console.log("3. Edit your OAuth client ID:");
        console.log("   606112568733-gtvo8bcik8lstm63rhtne8vkoab0d8f4");
        console.log("4. Verify:");
        console.log("   - Application type = 'Chrome Extension'");
        console.log("   - Application ID = your Extension ID");
        console.log("5. Save and try authentication again");
        
    } else {
        console.log("❌ Earth Agent extension not found");
        console.log("Make sure the extension is loaded and enabled");
    }
}

// Run the verification
verifyOAuthSetup(); 