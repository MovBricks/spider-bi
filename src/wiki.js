const fs = require('fs');
var path = require('path');
const puppeteer = require('puppeteer');
const { TimeoutError } = require('puppeteer/Errors');

const mainUrl = 'http://tapd.oa.com/AVWEB/markdown_wikis/#1010132111007808419';// wiki地址
const filePath = `./data/wiki/`; // 本地存储地址
const headlessSwitch = true; // 无头模式开关，网页生成PDF，只能在无头模式下
const executablePath = `/Applications/Chromium.app/Contents/MacOS/Chromium` // Chromium 的地址，这是Chromium安装后，MAC的默认位置
const START_INDEX = 0;

// 同步递归创建所有目录
function mkdirs (dir, cb) {
    var pathinfo = path.parse(dir)
    if (!fs.existsSync(pathinfo.dir)) {
        mkdirs(pathinfo.dir,function() {
            fs.mkdirSync(pathinfo.dir);
        })
    } 
    cb && cb()
}
async function mkdirHandler(path) {
    return new Promise((resolve, reject) => {
        mkdirs(path, () => {
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
        });
    })
}

// async function mkdirHandler(path) {
//     return new Promise((resolve, reject) => {
//         fs.access(path, (err) => {
//             if(err) {
//                 fs.mkdir(path, (err)=> {
//                     if(err){
//                         reject(err);
//                     } else {
//                         resolve();
//                     }
//                 });
//             } else {
//                 resolve();
//             }
//         })
//     })
// }

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

// 队列任务执行间隔
async function runAsTasks(tasks, sec = 0) {
    // ES9新特性
    for await (const task of tasks) {
        await new Promise((resolve, reject) => {
            setTimeout(async ()=>{
                await task();
                resolve();
            }, sec * 1000)
        })
    }
}


async function downloadContent(result) {

    const {title, content, path = ''} = result;

    // 创建文件夹
    const err = await mkdirHandler(path);

    if (err) {
        console.log(`${title} err!`);
        console.log(`错误详情：${err}`);
        return err;
    }

    const fileExtension = `.text`;
    async function getWriteResource(fileExtension, filename, data){

        // 写入硬盘
        await writeToDisk(`${path}/${filename}${fileExtension}`, data);
    }

    await getWriteResource(fileExtension, title, content);

}
async function downloadContentByNodeList(nodeList, page, oriParentPath = '') {
    // 生成Promise任务队列
    const tasks = nodeList.map(async (node, index) => {
        return async () => {
            await node.click();
            console.log(' ');
            console.log('点击标题,并等待');
            
            const selectorContent = `#wiki_right`;
            try {
                await page.waitFor(selectorContent);
                await page.waitForNavigation({
                    waitUntil: [`networkidle0`]
                });
            } catch (e) {
              if (e instanceof TimeoutError) {
                throw new Error(`网络请求超时,请根据最外层标题序号设置 START_INDEX; 并重启程序`);
              }
            }

            console.log('网络请求结束，右边内容加载完成');

            const { wikiName, searchable } = await page.$eval(selectorContent, (node) => {
                const nodeWikiName = node.querySelector(`#wikiName`);
                
                // 获取标题
                const wikiName = nodeWikiName.innerText;
                console.log(wikiName);

                // 获取内容-用于搜索
                let nodeSearchale = node.querySelector(`#searchable`);
                console.dir(!!nodeSearchale);
                if (!nodeSearchale) {
                    nodeSearchale = node.querySelector(`#description_div`);
                }
                let searchable = ' '
                if (nodeSearchale) {
                    searchable = nodeSearchale.innerText;
                }

                return {
                    wikiName,
                    searchable
                }
            });
            console.log(wikiName);
            let parentPath = oriParentPath;
            const path = `${filePath}${parentPath}${wikiName}`;

            // 写入
            await downloadContent({
                title: wikiName,
                content: searchable,
                path
            });

            // 在headless 模式下才能用，生成 'screen' media 格式的pdf.
            if (headlessSwitch) {
                await page.emulateMedia('screen');
                await page.pdf({
                    path: `${path}/${wikiName}.pdf`,
                    displayHeaderFooter: true,
                    // 要想页脚展示出来，一定要margin出一定的空间。页眉同理。
                    margin:{
                        bottom: `50px`
                    }
                });
            }

            // 查看是否能展开子元素列表
            // console.log(node)
            const canClick = await node.$eval(`.button`, (node) => {
                // console.log(node);
                const canClick = node.className.indexOf(`noline_docu`);
                // console.log(node.className);
                // console.log(canClick);
                return !!(canClick === -1);
            });

            if(canClick) {
                // 点击展开子列表
                const openButton = await node.$(`.button`);
                // console.dir(openButton);
                await openButton.click();
                const selectorList = `ul > li`;
                const nList = await node.$$(selectorList);
                console.log(`子列表长度：${nList.length}`);
                if(nList && Array.isArray(nList)) {
                    parentPath = parentPath + `${wikiName}/`;
                    console.log(parentPath);
                    await downloadContentByNodeList(nList, page, parentPath);
                    console.log(parentPath);
                }
            } else {
                console.log(`没有子列表`);
            }
        
            console.log(`${wikiName} OK!`);
            
        } 
    });

    // 串行执行队列
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
    
    // 可以设定开始的节点序号
    await downloadContentByNodeList(nodeList.slice(START_INDEX), page);

}

async function getSpiderUrl() {
    
    const browser = await puppeteer.launch({
        executablePath: executablePath,
        devtools: true,
        headless: headlessSwitch,
        dumpio: true,
        slowMo: 0,
    });
    const page = await browser.newPage();

    downloadContentByUrl(mainUrl, page, browser);
}

getSpiderUrl();
