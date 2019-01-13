const fs = require('fs');
const puppeteer = require('puppeteer');
const axios = require('axios');
const mainUrl = 'http://tapd.oa.com/AVWEB/markdown_wikis/#1010132111007808419';
const filePath = `./data/wiki/`;

async function mkdirHandler(path) {
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

async function writeToDiskPipe(fileName, data) {
    return new Promise((resolve, reject) => {
        const wStream = fs.createWriteStream(fileName);
        data.pipe(wStream);
        data.on('end', () => {
            resolve();
            console.log(`写入结束`)
        })
    });
}

async function writeToDisk(fileName, data) {
    return new Promise((resolve, reject) => {
        const wStream = fs.createWriteStream(fileName);
        wStream.write(data,() => {
            resolve();
            console.log(`${fileName} 写入结束`);
        });
        wStream.on(`error`, (err) => {
            reject();
            console.log(`${fileName} 写入错误: ${err}`);
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

/*
    result: {
        title, //列表主标题
        content, //列表主内容
        list: {
            title, //元素标题
            content, //元素内容
        } // 列表内容
    }

*/
async function downloadContent(result) {

    const {title, content, list} = result;

    // 创建文件夹
    const path = `${filePath}${title}`;

    const err = await mkdirHandler(path);

    if (err) {
        console.log(`${title} err!`);
        console.log(`错误详情：${err}`);
        return err;
    }

    const fileExtension = `.text`;
    async function getWriteResource(fileExtension, filename, data){
        // 生成 'screen' media 格式的pdf.
        // await page.emulateMedia('screen');
        // await page.pdf({
        //     path: `${path}/${filename}.pdf`,
        //     headerTemplate: `url`
        // });

        // 写入硬盘
        await writeToDisk(`${path}/${filename}${fileExtension}`, data);
    }

    // TODO 查看是否能展开子元素列表


    await getWriteResource(fileExtension, title, content);

    // if (list && list.length > 0) {
    //     const tasks = list.map((item, index) => {
    //         return async () => {
    //             const {title, content} = item;
    //             await getWriteResource(fileExtension, title, content);
    //         }
    //     });
    
    //     await runAsTasks(tasks);
    // }

    // console.log(`${title} OK!`);
}

async function downloadContentByNodeList(nodeList, page) {
    const tasks = nodeList.map(async node => {
        return async () => {
            await node.click();
            console.log(' ');
            console.log('点击标题,并等待');
            
            const selectorContent = `#wiki_right`;
            await page.waitForNavigation({
                waitUntil: [`networkidle0`]
            });
            console.log('没有网络请求，右边内容加载完成');

            const { wikiName, searchable} = await page.$eval(selectorContent, (node) => {
                const nodeWikiName = node.querySelector(`#wikiName`);
                
                // 获取标题
                const wikiName = nodeWikiName.innerText;
                console.log(wikiName);

                // 获取内容-用于搜索
                const nodeSearchale = node.querySelector(`#searchable`);
                console.dir(nodeSearchale);
                const searchable = nodeSearchale.innerText;
                return {
                    wikiName,
                    searchable
                }
            });



            if (list && list.length > 0) {
                const tasks = list.map((item, index) => {
                    return async () => {
                        await downloadContent({
                            title: wikiName,
                            content: searchable
                        });
                    }
                });
            
                await runAsTasks(tasks);
            }

            console.log(`${title} OK!`);
            
        } 
    });

    await runAsTasks(tasks);
}

async function downloadContentByUrl(url, page, browser) {

    const selector = {
        list: '#wiki_structure_1_ul > li',
        content: '#wiki_content',
        title: '#wikiName'
    }

    await page.goto(url);
    //IOA 登录
    await page.waitFor(`#btn_smartlogin`);
    const ioaButton = await page.$(`#btn_smartlogin`);
    ioaButton.click();
    console.log('IOA 登录');

    await page.waitFor(selector.list);
    console.log('列表加载完毕');
    // 获取列表
    const nodeList = await page.$$(selector.list);

    await page.waitFor(2000);

    downloadContentByNodeList(nodeList, page);

    // 点击展开子列表
    // const rttr = await nodeList[2].$(`.button`)
    // await rttr.click();

}

async function getSpiderUrl() {
    
    const browser = await puppeteer.launch({
        executablePath: `/Applications/Chromium.app/Contents/MacOS/Chromium`,
        devtools: true,
        headless: false,
        dumpio: true,
        slowMo: 0,
    });
    const page = await browser.newPage();

    downloadContentByUrl(mainUrl, page, browser);
}

getSpiderUrl();
