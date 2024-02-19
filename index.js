"use strict";

// Imports
import axios from 'axios';
import CurrencyAPI from '@everapi/currencyapi-js';
import ExcelJS from 'exceljs';
import cheerio from 'cheerio';
import dotenv from 'dotenv';

// Configuring Curerency API
dotenv.config();
const apiKey = process.env.API_KEY;
const currencyApi = new CurrencyAPI(apiKey);

/**
 * Parses HTML from Xbox game deals page to extract game name, 
 * prices, and calculate sell price.
 * 
 * @async
 * @returns {Promise <Object[]>} - Promise of an array of game objects with name, prices, sell price
 */
async function parseHTML() {
            
    // Currency conversion
    let exchangeRate;
    currencyApi.latest({
        currencies: "RUB"
    }).then(response => {
        exchangeRate = response.data["RUB"].value
        console.log('💰    Курс обмена USD на RUB: ', exchangeRate)
    }).catch(err => {
        console.log('Возникла ошибка при переводе валюты: ' + err)
    })

    // Request HTML from xbox-now
    const response = await axios.get('https://www.xbox-now.com/en/deal-list', {
        headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/58.0.3029.110 Safari/537.3',
            // Add other necessary headers here
        }
    });
    const html = response.data;
    let aIsName = true;

    // Parsing HTML
    const $ = cheerio.load(html);
    let game = {};
    let games = [];

    $('.box-body.comparison-table-entry .col-xs-12.col-lg-6').each(function (i, element) {


        if (aIsName) {
            game['name'] = $(this).find('a').text().trim();
        } else {

            const prices = $(this).find('span').text().match(/(?:\d{1,3},)*\d{1,3}(?:\.\d+)?/g);

            const lowPrice = Math.round(+prices[2] * exchangeRate);
            const highPrice = Math.round(+prices[1] * exchangeRate);
            let sellPrice;

            if (lowPrice <= 300) {
                sellPrice = lowPrice + lowPrice * 1.5;
            } else if (lowPrice <= 800) {
                sellPrice = lowPrice + lowPrice * 1.2;
            } else if (lowPrice <= 1000) {
                sellPrice = lowPrice + lowPrice * 0.8;
            } else if (lowPrice <= 1500) {
                sellPrice = lowPrice + lowPrice * 0.5;
            } else if (lowPrice <= 2500) {
                sellPrice = lowPrice + lowPrice * 0.3;
            } else if (lowPrice <= 3000) {
                sellPrice = lowPrice + lowPrice * 0.28;
            } else if (lowPrice <= 3500) {
                sellPrice = lowPrice + lowPrice * 0.25;
            } else {
                sellPrice = lowPrice + lowPrice * 0.2;
            }

            sellPrice = roundToNinety(sellPrice);

            game['highPrice'] = highPrice;
            game['lowPrice'] = lowPrice;
            game['sellPrice'] = sellPrice;

            games.push(game);
            game = {};
        }

        aIsName = !aIsName;
    });

    return(games);
}

/**
 * Creates an Excel workbook with game data. 
 * 
 * @param {Object[]} games - Array of game objects
 * @returns {Promise} - Promise that resolves when file is created
 */
function createXlsx(games){

    const dateObj = new Date();
    const month = String(dateObj.getMonth() + 1).padStart(2, '0');
    const year = dateObj.getFullYear();
    const day = String(dateObj.getDate()).padStart(2, '0');

    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Список игр');

    // Add headers 
    worksheet.columns = [
        { header: 'Название', key: 'name' },
        { header: 'Высокая цена', key: 'highPrice' },
        { header: 'Цена покупки', key: 'lowPrice'},
        { header: 'Цена продажи с комиссией', key: 'sellPrice' }
    ];
    
    // Add rows
    games.forEach((game, i) => {
    worksheet.addRow([game.name, game.highPrice, game.lowPrice, game.sellPrice]); 
    });

    // Export to file
    workbook.xlsx.writeFile(`./reports/games_${day}_${month}_${year}.xlsx`)
    .then(() => {
        console.log(`✅    Сохранено в reports/games_${day}_${month}_${year}.xlsx!`);
    });
}

/**
 * Ceils number to closest number that ends with '90' (190, 90, 290, 1990, etc.). 
 * 
 * @param {number} num - Number that is needed to be ceiled
 * @returns {number} - Ceiled number
 */
const roundToNinety = function (num) {
    return (Math.ceil((num+10)/100)*100-10);
};

// Parse and create xlsx
createXlsx(await parseHTML());