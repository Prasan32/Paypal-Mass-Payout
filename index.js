const express = require('express');
const axios = require('axios');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;
const PAYPAL_API = `https://api-m.sandbox.paypal.com`;

const { CLIENT_ID, SECRET } = process.env;

app.set('view engine', 'ejs');
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

const getAccessToken = async () => {
    const response = await axios({
        method: 'POST',
        url: `${PAYPAL_API}/v1/oauth2/token`,
        headers: {
            'Accept': 'application/json',
            'Accept-Language': 'en_US',
            'Content-Type': 'application/x-www-form-urlencoded',
        },
        auth: {
            username: CLIENT_ID,
            password: SECRET,
        },
        params: {
            grant_type: 'client_credentials'
        }
    });
    return response.data.access_token;
};

const createPayout = async (accessToken, items) => {
    const response = await axios({
        url: `${PAYPAL_API}/v1/payments/payouts`,
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
        },
        data: {
            sender_batch_header: {
                sender_batch_id: `batch_${Math.random() * 1000000}`,
                email_subject: "You have a payout!",
                email_message: "You have received a payout! Thanks for using our service!"
            },
            items
        }
    });
    return response.data;
};

app.use((req, res, next) => {
    console.log(req.url);
    next();
})

app.get('/', (req, res) => {
    res.render('index');
});

app.post('/payout', async (req, res) => {
    const { recipients } = req.body;
    const items = recipients.map((recipient, index) => ({
        recipient_type: "EMAIL",
        amount: {
            value: recipient.amount,
            currency: "USD"
        },
        receiver: recipient.email,
        note: `Thanks for using our service!`,
        sender_item_id: `item_${index + 1}`
    }));
    
    try {
        const accessToken = await getAccessToken();
        const payoutResponse = await createPayout(accessToken, items);
        res.render('success', { payoutResponse: payoutResponse });
    } catch (error) {
        res.render('error', { error: error.response ? error.response.data : error.message });
    }
});

app.post('/webhookresponse', async (req, res, next) => {
    console.log('webhookresponse');
    console.log(req.body);
    res.sendStatus(200);
})


app.listen(PORT, () => {
    console.info(`Server is listening on ${PORT}`);
});
