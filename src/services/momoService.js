import axios from 'axios';
import { v4 as uuidv4 } from 'uuid';
import prisma from '../utils/prismaClient.js'; 
import { MOMO_SUBSCRIPTION_KEY, MOMO_CALLBACK_HOST } from '../config/env.js';

const BASE_URL = 'https://sandbox.momodeveloper.mtn.com';  
const MOMO_ENV = process.env.MOMO_ENV || 'sandbox';

// Provision API User and Key (run once or on startup if needed)
async function provisionApiUser() {
  const referenceId = uuidv4();  
  const callbackHost = MOMO_CALLBACK_HOST || '';  

  // Create API User
  await axios.post(
    `${BASE_URL}/v1_0/apiuser`,
    { providerCallbackHost: callbackHost },
    {
      headers: {
        'X-Reference-Id': referenceId,
        'Ocp-Apim-Subscription-Key': MOMO_SUBSCRIPTION_KEY,
      },
    }
  );

  // Get API Key
  const { data } = await axios.post(
    `${BASE_URL}/v1_0/apiuser/${referenceId}/apikey`,
    {},
    {
      headers: {
        'Ocp-Apim-Subscription-Key': MOMO_SUBSCRIPTION_KEY,
      },
    }
  );
  const apiKey = data.apiKey;

  // Store referenceId and apiKey securely
  console.log('API User Provisioned. Reference ID:', referenceId, 'API Key:', apiKey);
  return { referenceId, apiKey };
}

// Get Access Token (call before each API request)
async function getAccessToken(referenceId, apiKey) {
  const auth = Buffer.from(`${referenceId}:${apiKey}`).toString('base64');
  const { data } = await axios.post(
    `${BASE_URL}/collection/token/`,
    {},
    {
      headers: {
        'Authorization': `Basic ${auth}`,
        'Ocp-Apim-Subscription-Key': MOMO_SUBSCRIPTION_KEY,
      },
    }
  );
  return data.access_token;
}

// Collect Payment (for createBooking)
export async function collectPayment(msisdn, amount, externalId, payerMessage = 'Ho Rentals Booking') {
  // Provision if not done (in production, do this once and store)
  const { referenceId, apiKey } = await provisionApiUser();  
  const token = await getAccessToken(referenceId, apiKey);
  const referenceIdForPay = uuidv4();  

  const paymentOptions = {
    amount: amount.toString(),
    currency: 'GHS',
    externalId,
    payer: { partyIdType: 'MSISDN', partyId: `233${msisdn.slice(1)}` },
    payerMessage,
    payeeNote: 'Property booking payment',
  };

  await axios.post(
    `${BASE_URL}/collection/v1_0/requesttopay`,
    paymentOptions,
    {
      headers: {
        'X-Reference-Id': referenceIdForPay,
        'X-Target-Environment': MOMO_ENV,
        'Ocp-Apim-Subscription-Key': MOMO_SUBSCRIPTION_KEY,
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
    }
  );

  return referenceIdForPay;  
}

// Disburse to Partner 
export async function disburseToPartner(momoAccount, amount, externalId) {
  // Similar provisioning and token logic as above
  const { referenceId, apiKey } = await provisionApiUser();
  const token = await getAccessToken(referenceId, apiKey);
  const referenceIdForDisburse = uuidv4();

  const transferOptions = {
    amount: amount.toString(),
    currency: 'GHS',
    externalId,
    payee: { partyIdType: 'MSISDN', partyId: `233${momoAccount.slice(1)}` },
    payerMessage: 'Ho Rentals Partner Payout',
    payeeNote: 'Booking commission deducted',
  };

  await axios.post(
    `${BASE_URL}/disbursement/v1_0/transfer`,
    transferOptions,
    {
      headers: {
        'X-Reference-Id': referenceIdForDisburse,
        'X-Target-Environment': MOMO_ENV,
        'Ocp-Apim-Subscription-Key': MOMO_SUBSCRIPTION_KEY,
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
    }
  );

  return referenceIdForDisburse;
}

// Callback Handler (unchanged)
export async function handleCollectionCallback(req, res) {
  const { externalId, resultCode, amount } = req.body;
  if (resultCode === 0) {
    await prisma.booking.update({ where: { momoTxId: externalId }, data: { status: 'paid' } });
    const booking = await prisma.booking.findUnique({ where: { momoTxId: externalId }, include: { company: true } });
    if (!booking.company.isOwnCompany && booking.commissionAmount > 0) {
      const netAmount = booking.totalAmount - booking.commissionAmount;
      await disburseToPartner(booking.company.momoAccount, netAmount, `payout_${externalId}`);
    }
  }
  res.sendStatus(200);
}

// Call provisionApiUser() on server startup if needed (add to server.js)