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