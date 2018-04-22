const requestSync = require('sync-request')
const request = require('request')
const cheerio = require('cheerio')
const fs = require('fs')
const path = require('path')

const log = console.log.bind(console)

const ensureDir = (dir) => {
    const exist = fs.existsSync(dir)
    if (!exist) {
        fs.mkdirSync(dir)
    }
    return dir
}

const saveFile = (path, file) => {
    file = JSON.stringify(file, null, 2)
    fs.writeFileSync(path, file)
}

const downloadCover = (movies) => {
    const dir = 'cover/'
    ensureDir(dir)
    movies.map( (m) => {
        let name = m.title.split('/').join(' ')
        name = name.split(':').join('-') + '.jpg'
        const p = path.join(__dirname, './' , dir + name)
        const url = m.feedImg
        request(url).pipe(fs.createWriteStream(p))
    })

}

const cacheUrl = (url) => {
    let name = url.split('/').slice(-1)[0]
    if (name === ''){
        name = 'index-1.html'
    }
    let dir = 'download/'
    ensureDir(dir)
    const file = path.join(__dirname, './', dir, name )
    const exist = fs.existsSync(file)
    if (exist) {
        let body = fs.readFileSync(file)
        return body
    } else {
        const r = requestSync('GET', url)
        let body = r.getBody('utf-8')
        fs.writeFileSync(file, body)
        return body
    }
}

const movieFromDiv = (movie) => {
    const e = cheerio.load(movie)

    let rank = e('.number').find('em').text()
    rank = Number(rank)

    const coverUrl = e('.mov_pic').find('a').find('img').attr('src')
    const feedImg = coverUrl.split('_').slice(0, -1).join('_') + '_o.jpg'

    const title = e('.mov_pic').find('a').attr('title')
    const detailUrl = e('.mov_pic').find('a').attr('href')

    let year = e('.mov_con').find('h2').find('a').text()
    year = Number(year.slice(-5,-1))
    // http://img31.mtime.cn/mt/2013/11/08/145957.19577928_96X128.jpg

    let director = e('.mov_con').find('p').get(0)
    director = e(director).find('a').text()

    let casts = []
    let actors = e('.mov_con').find('p').get(1)
    e(actors).find('a').each( (i, actor) => {
        let a = e(actor).text()
        casts.push(a)
    })


    let types = []
    let t = e('.mov_con').find('p').get(2)
    e(t).find('a').each( (i, type) => {
        let a = e(type).text()
        types.push(a)
    })

    const quote = e('.mov_con').find('.mt3').text()

    let point = e('.mov_point').find('span').text()
    point = Number(point)

    let vote = e('.mov_point').find('p').text()
    vote = Number(vote.slice(0, -5))

    return {rank, coverUrl, feedImg, title, detailUrl, director, casts, quote, types, year, point, vote}
}

const movieFromUrl = (url) => {
    let body = cacheUrl(url)
    const e = cheerio.load(body)
    let items = e('#asyncRatingRegion').find('li')
    let movies = []
    for (let i = 0; i < items.length; i++ ) {
        let div = items[i]
        let m =  movieFromDiv(div)
        movies.push(m)
    }
    return movies
}

if (require.main === module) {
    let movies = []
    for (let i = 1; i <= 10; i++ ) {
        let url
        if(i === 1) {
            url = 'http://www.mtime.com/top/movie/top100/'
        } else {
            url = `http://www.mtime.com/top/movie/top100/index-${i}.html`
        }
        let movie = movieFromUrl(url)
        movies = movies.concat(movie)
    }

    Promise.all(movies)
        .then( (movie) => {
            let path = 'result.json'
            saveFile(path, movie)
            downloadCover(movie)
        })

}