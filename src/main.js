const fs = require('fs');
const puppeteer = require('puppeteer');
const axios = require('axios');
const mainUrl = 'https://h.bilibili.com/p'

async function getSpiderUrl() {
    
    const browser = await puppeteer.launch({
        executablePath: `/Applications/Chromium.app/Contents/MacOS/Chromium`,
        devtools: true,
        headless: false
    });
    const page = await browser.newPage();

    const spiderUrl = 'https://h.bilibili.com/1215747'
    downloadImgsByUrl(spiderUrl, browser, page);
}

const mkdirHandler = (path) => {
    return new Promise((resolve, reject) => {
    fs.access(path, (err) => {
        if(err) {
            fs.mkdir(path, (err)=> {
                if(err){
                    reject(err);
                } else {
                    resolve();
                }
            });
        } else {
            resolve();
        }
    })
})
}

async function writeToDisk(fileName, data) {
    return new Promise((resolve, reject) => {
        const wStream = fs.createWriteStream(fileName);
        data.pipe(wStream);
        data.on('end', () => {
            resolve();
            console.log(`结束`)
        })
    });
}

async function runAsTasks(tasks, sec = 1) {
    for await (const task of tasks) {
        await new Promise((resolve, reject) => {
            setTimeout(async ()=>{
                await task();
                resolve();
            }, sec * 1000)
        })
    }
}

async function downloadImgs(result) {

    const imgURL = result.imgUrlList;
    const title = result.title;

    console.log('imgURL', imgURL.length);

    const path = `./data/img/${title}`;
    
    const err = await mkdirHandler(path);

    if (err) {
        console.log(`${title} err!`);
        console.log(`错误详情：${err}`);
        browser.close();
        return err;
    }

    async function getWriteResource(e, i){
        const fileExtension = e.match(/\.[^\.]+$/)
        const res = await axios.get(e, {   
            responseType: 'stream'
        })

        await writeToDisk(`${path}/${i}${fileExtension}`, res.data);
    }

    const tasks = imgURL.map((e, i) => {
        return async () => {
            getWriteResource(e, i)
        }
    });

    await runAsTasks(tasks)
    
    console.log(`${title} OK!`);
}

async function downloadImgsByUrl(url, browser, page) {

    const selector = {
        content: 'body > div.app-ctnr > div.ssr-content > main > section.main-section.p-relative.dp-i-block.v-top > div.article-content-ctnr.p-relative.border-box > article > div.content > div.images > img',
        title: 'body > div.app-ctnr > div.ssr-content > main > section.main-section.p-relative.dp-i-block.v-top > div.article-content-ctnr.p-relative.border-box > header > div > h1'
    }

    await page.goto(url);
    await page.waitFor(selector.content);
    console.log('await page.evaluate');
    const result = await page.evaluate((selector) => {
        console.log('Start to crawl girl pivtures...');
        let imgUrlList = [];
        const title = document.querySelectorAll(selector.title)[0].innerText;
        const nodeList = document.querySelectorAll(selector.content);
        nodeList.forEach((val) => {
            imgUrlList.push(val.attributes['data-photo-imager-src'].value);
        });
        let nextPage = '';
        return {imgUrlList, title, nextPage};
    },selector);

    await downloadImgs(result);

    // browser.close();
}

getSpiderUrl();