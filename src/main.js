const fs = require('fs');
const puppeteer = require('puppeteer');

const spiderUrl = 'https://h.bilibili.com/1215747'

// superagent.get('https://h.bilibili.com/1215747').end((err, res) => {
//     if (err) {
//         console.log(err);
//     }
//     var $ = cheerio.load(res.text);
//     console.log(res.text);
//     console.log($('header').text());
// })

async function run(url) {
    const browser = await puppeteer.launch({
        headless: false
    });
    const page = await browser.newPage();
    await page.goto(url);
    await page.waitFor(5000);
    console.log('await page.evaluate');
    let imgURL = await page.evaluate(() => {
        console.log('Start to crawl girl pivtures...');
        let imgUrlList = [];
        let selector = 'body > div.app-ctnr > div.ssr-content > main > section.main-section.p-relative.dp-i-block.v-top > div.article-content-ctnr.p-relative.border-box > article > div.content > div.images > img';
        let nodeList = document.querySelectorAll(selector);
        console.log(nodeList);
        nodeList.forEach((val) => {
            imgUrlList.push(val.attributes['data-photo-imager-src'].value);
        })
        return imgUrlList;
    });

    console.log('imgURL', imgURL.length);
    // imgURL.forEach((e, i) => {
    //     console.log(e)
    //     // if (currentNumber === 200) {
    //     //     browser.close();
    //     //     console.log('All pictures downloaded complete!')
    //     //     return
    //     // }
    //     // axios.get(e, {
    //     //     responseType: 'stream'
    //     // }).then(res => {
    //     //     res.data.pipe(fs.createWriteStream(`./meizi/${currentNumber}.${e.substr(e.length-3)}`));
    //     //     currentNumber++;
    //     // })
    // });

    // let nextPage = await page.evaluate(() => {
    //     return document.querySelectorAll('#comments > div:nth-child(4) > div > a.previous-comment-page')[0].href;
    // })

    console.log('OK!');
    // setTimeout(function() {
    //     run(nextPage)
    // }, 3000);



}
run(spiderUrl);