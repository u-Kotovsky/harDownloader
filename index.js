const startTime = process.uptime();

const fs = require('fs');
const http = require('http');
const https = require('https');

const input_path = './input/';
const output_path = `./output/${Date.now()}`;
const files = fs.readdirSync(input_path);

files.forEach(filename => {
    try {
        if (filename.endsWith('.har')) {
            parseHar(filename);
        }
    } catch (error) {
        console.error(error);
    }
});

function parseHar(filename) {
    fs.readFile(input_path + filename, async (err, data) => {
        //const entries = JSON.parse(data).log.entries;
        const entries = JSON.parse(new TextDecoder().decode(data)).log.entries;

        for (let i = 0; i < entries.length; i++) {
            const entry = entries[i];
            if (entry.request.url.startsWith('http')) {
                const correct = i + 1;
                if (!await parseEntry(filename, entry)) {
                    console.log(`Downloading.. | Progress: ${correct}/${entries.length}`);
                }
                console.log((parseEntry(filename, entry)
                    ? `file not cached, downloading..`
                    : `file is cached, copying..`) + ` | ${correct}/${entries.length}`)
            }
        }

        console.log('Finished at ' + (process.uptime() - startTime).toFixed(2) + ' second(s)');
    });
}

async function parseEntry(fn, entry) {
    const _domain = fn.split('.har')[0]
    const domain = entry.request.url.split('/')[2];

    if (domain != _domain) {
        console.log(domain + ' ' + _domain);
        return;
    }

    const __split = entry.request.url.split(_domain);

    const path = output_path + __split[1].split('?')[0];
    const _filename = path.split('/')[path.split('/').length - 1];
    const _dir = path.split(_filename)[0];

    const __path = path.split('/');
    let _path = "";

    _dir.split('/').forEach(dir => {
        if (dir.length > 0) {
            const count = __path.length;
            const element = __path[count];

            if (element != _filename) {
                _path += dir + "/";
                if (!fs.existsSync(_path)) {
                    fs.mkdirSync(_path);
                }
            }
        }
    });

    let content = await download(entry.request.url);
    console.log(_path + _filename);
    fs.writeFile(_path + _filename, content, (err) => {
        if (err)
            throw err;
    });
}

function download(url) {
    return new Promise((resolve, reject) => {
        let client = http;
        if (url.startsWith('https'))
            client = https;

        client.get(url, (res) => {
            let data = '';

            res.on('data', (chunk) => {
                data += chunk;
            });
            res.on('end', () => {
                resolve(data);
            });
        }).on('error', (err) => {
            resolve(false);
        });
    })
}