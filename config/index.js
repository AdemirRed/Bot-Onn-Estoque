'use strict';

const config = {
    CC_DATA_BASE_PATH: process.env.CC_DATA_BASE_PATH || 'your_default_value', // Update with actual default if applicable
    WHATSAPP_API_URL: process.env.WHATSAPP_API_URL || 'http://192.168.0.201:200',
    // other configurations...
};

module.exports = config;
