const fs = require('fs');
const puppeteer = require('puppeteer');
const axios = require('axios');

async function getSpiderUrl() {
    const listOptionOri = {
        category: 'cos',
        type: 'hot',
        page_num: 0,
        page_size: 20
    };
    
    const listUrl = 'https://api.vc.bilibili.com/link_draw/v2/Photo/list';
    
    function getListUrl(option = listOptionOri) {
        return `${listUrl}?category=${option.category}&type=${option.type}&page_num=${option.page_num}&page_size=${option.page_size}`;
    }
    
    const response = await axios.get(getListUrl())
    const res = response.data;
   
    if (res.code === 0) {
        let items = res.data.items;
        console.log(JSON.stringify(items));

        items.forEach(async (item) => {
            let imgUrlList = [];
            item.item.pictures.forEach((val) => {
                imgUrlList.push(val.img_src);
            });
            const title = item.item.title;
    
            await writeFile({
                imgUrlList,
                title
            });
        });

    }   

    // const spiderUrl = 'https://h.bilibili.com/1215747'
    // downloadImgsByUrl(spiderUrl);
}


async function writeFile(result) {

    const imgURL = result.imgUrlList;
    const title = result.title.replace(/[\\/\.]/, '_');

    const path = `./data/img/${title}`;
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

    await mkdirHandler(path).catch(err => {
        if (err) {
            console.log(`${title} err!`);
            console.log(`错误详情：${err}`);
            browser.close();
            return err;
        }
    });

    imgURL.forEach(async (e, i) => {
        if (i === 200) {
            browser.close();
            console.log('All pictures downloaded complete!')
            return
        }

        const fileExtension = e.match(/\.[^\.]+$/)
        res = await axios.get(e, {   
            responseType: 'stream'
        });

        function writeToDisk(fileName, data) {
            return new Promise((resolve, reject) => {
                const wStream = fs.createWriteStream(fileName);
                data.pipe(wStream);
            });
        }

        await writeToDisk(`${path}/${i}${fileExtension}`, res.data);
    });
    console.log(`${title} OK!`);
}

async function downloadImgsByUrl(url) {

    const selector = {
        content: 'body > div.app-ctnr > div.ssr-content > main > section.main-section.p-relative.dp-i-block.v-top > div.article-content-ctnr.p-relative.border-box > article > div.content > div.images > img',
        title: 'body > div.app-ctnr > div.ssr-content > main > section.main-section.p-relative.dp-i-block.v-top > div.article-content-ctnr.p-relative.border-box > header > div > h1'
    }
    
    const browser = await puppeteer.launch({
        devtools: true,
        headless: false
    });
    const page = await browser.newPage();
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
        return {imgUrlList, title, nextPage};
    },selector);

    const imgURL = result.imgUrlList;
    const title = result.title;

    console.log('imgURL', imgURL.length);

    const path = `./data/img/${title}`;
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
    const err = await mkdirHandler(path);

    if (err) {
        console.log(`${title} err!`);
        console.log(`错误详情：${err}`);
        browser.close();
        return err;
    }

    imgURL.forEach((e, i) => {
        console.log(e)
        if (i === 200) {
            browser.close();
            console.log('All pictures downloaded complete!')
            return
        }

        const fileExtension = e.match(/\.[^\.]+$/)
        axios.get(e, {   
            responseType: 'stream'
        }).then(res => {
            const wStream = fs.createWriteStream(`${path}/${i}${fileExtension}`)
            res.data.pipe(wStream);
        })
    });

    console.log(`${title} OK!`);
    browser.close();
}

getSpiderUrl();