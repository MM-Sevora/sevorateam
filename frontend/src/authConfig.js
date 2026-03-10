// Azure AD Configuration
export const msalConfig = {
    auth: {
        clientId: process.env.REACT_APP_AZURE_CLIENT_ID || "ec50e216-1abe-4c0f-af5c-1f4d50d51234",
        authority: `https://login.microsoftonline.com/${process.env.REACT_APP_AZURE_TENANT_ID || "bbe9ab04-36a1-4b03-833b-a798ddb2f232"}`,
        redirectUri: window.location.origin,
        postLogoutRedirectUri: window.location.origin,
        navigateToLoginRequestUrl: true,
    },
    cache: {
        cacheLocation: "localStorage", // Changed to localStorage for persistence across tabs
        storeAuthStateInCookie: true, // Enable for IE11/Edge compatibility
    },
    system: {
        allowRedirectInIframe: false,
        windowHashTimeout: 60000,
        iframeHashTimeout: 6000,
        loadFrameTimeout: 0,
    }
};

export const loginRequest = {
    scopes: ["User.Read", "openid", "profile", "email"],
};

// Email-specific scopes for Microsoft Graph Mail API
export const mailRequest = {
    scopes: [
        "User.Read",
        "Mail.Read",
        "Mail.ReadWrite", 
        "Mail.Send",
        "offline_access"
    ],
};

// Calendar-specific scopes for Microsoft Graph Calendar API
export const calendarRequest = {
    scopes: [
        "User.Read",
        "Calendars.ReadWrite",
        "Calendars.Read",
        "OnlineMeetings.ReadWrite",
        "offline_access"
    ],
};

// Teams Chat-specific scopes for Microsoft Graph Chat API
export const teamsRequest = {
    scopes: [
        "User.Read",
        "Chat.ReadWrite",
        "Chat.Read",
        "User.ReadBasic.All",
        "offline_access"
    ],
};

export const graphConfig = {
    graphMeEndpoint: "https://graph.microsoft.com/v1.0/me",
};
