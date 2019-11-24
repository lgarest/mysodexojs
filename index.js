const assert = require('assert');
const request = require('request');
const fs = require('fs');
const path = require('path');

const BASE_URL = 'https://sodexows.mo2o.com';
const LOGIN_ENDPOINT = 'v3/connect/login';
const GET_CARDS_ENDPOINT = 'v3/card/getCards';
const GET_DETAIL_CARD_ENDPOINT = 'v2/card/getDetailCard';
const GET_CLEAR_PIN_ENDPOINT = 'v1/card/getClearPin';
const JSON_RESPONSE_OK_CODE = 100;
const JSON_RESPONSE_OK_MSG = 'OK';
const DEFAULT_DEVICE_UID = 'device_uid';
const DEFAULT_OS = 0;

const CERT_FILENAME = "sodexows.mo2o.com_client-android.crt.pem";
const KEY_FILENAME = 'sodexows.mo2o.com_client-android.key.pem';
certFilePath = path.resolve(__dirname, CERT_FILENAME);
keyFilePath = path.resolve(__dirname, KEY_FILENAME);


const getFullEndpointUrl = (endpoint, lang) => {
  endpoint = endpoint.replace(/^\/+/, "");
  return `${BASE_URL}/${lang}/${endpoint}`;
}

/*
 * Raises an error if any in the `jsonResponse`.
 */
const handleCodeMsg = (jsonResponse) => {
  const { code, msg } = jsonResponse;
  assert(code === JSON_RESPONSE_OK_CODE, [code, msg]);
  assert(msg === JSON_RESPONSE_OK_MSG, [code, msg]);
}

/*
 * Posts `jsonData` to `endpoint` using the `cookieJar`.
 * Handles errors and callback with the json response.
 */
const sessionPost = (cookieJar, endpoint, jsonData, callback) => {
  const lang = 'en';
  const url = getFullEndpointUrl(endpoint, lang);
  const options = {
    url,
    json: jsonData,
    jar: cookieJar,
    cert: fs.readFileSync(certFilePath),
    key: fs.readFileSync(keyFilePath)
    // passphrase: 'password',
  };
  request.post(options, function (error, response, body) {
    assert(!error, error);
    assert(response && response.statusCode == 200, JSON.stringify(response));
    handleCodeMsg(body);
    callback(body.response);
  });
}

/*
 * Logins with credentials and returns session and account info.
 */
const login = (email, password, callback) => {
  const endpoint = LOGIN_ENDPOINT
  const cookieJar = request.jar();
  const jsonData = {
      "username": email,
      "pass": password,
      "deviceUid": DEFAULT_DEVICE_UID,
      "os": DEFAULT_OS,
  };
  sessionPost(cookieJar, endpoint, jsonData, (accountInfo) => {
    const data = {
      cookieJar,
      accountInfo,
    };
    callback(data);
  });
}

/*
 * Returns cards list and details using the cookie provided.
 */
const getCards = (cookieJar, dni, callback) => {
  const endpoint = GET_CARDS_ENDPOINT;
  const jsonData = { dni };
  sessionPost(cookieJar, endpoint, jsonData, (response) => {
    const cardList = response.listCard;
    callback(cardList);
  });
}

/*
 * Returns card details.
 */
const getDetailCard = (cookieJar, cardNumber, callback) => {
  const endpoint = GET_DETAIL_CARD_ENDPOINT;
  const jsonData = { cardNumber };
  json_response = sessionPost(cookieJar, endpoint, jsonData, (response) => {
    const { cardDetail } = response;
    callback(cardDetail);
  });
}

/*
 * Returns card pin.
 */
const getClearPin = (cookieJar, cardNumber, callback) => {
  const endpoint = GET_CLEAR_PIN_ENDPOINT;
  const jsonData = { cardNumber };
  sessionPost(cookieJar, endpoint, jsonData, (response) => {
    const { pin } = response.clearPin;
    callback(pin);
  });
}

const main = () => {
  const email = process.env.EMAIL;
  const password = process.env.PASSWORD;
  const getDetailCardCallback = (cardDetail) => {
    const { cardNumber } = cardDetail;
    console.log(`details ${cardNumber}:`);
    console.log(JSON.stringify(cardDetail, null, '  '));
  };
  const getCardsCallback = (cookieJar) => (cardList) => {
    const cards = cardList;
    console.log('cards:');
    console.log(JSON.stringify(cardList, null, '  '));
    const card = cards[0];
    const { cardNumber } = card;
    getDetailCard(cookieJar, cardNumber, getDetailCardCallback);
  };
  const loginCallback = (response) => {
    const { cookieJar, accountInfo } = response;
    console.log('account info:');
    console.log(JSON.stringify(accountInfo, null, '  '));
    const { dni } = accountInfo;
    getCards(cookieJar, dni, getCardsCallback(cookieJar));
  };
  login(email, password, loginCallback);
}

if (typeof require !== 'undefined' && require.main === module) {
  main();
}

module.exports = { sessionPost, login, getCards, getDetailCard, getClearPin };
