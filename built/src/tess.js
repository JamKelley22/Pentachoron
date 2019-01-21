var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : new P(function (resolve) { resolve(result.value); }).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var child_process = require('child_process');
var exec = child_process.exec, child;
var execSync = child_process.execSync;
var fs = require('fs');
var electron = require('electron');
var remote = electron.remote;
var app = remote.app;
var path = require('path');
var { dialog } = remote;
/*
const BrowserWindow = electron.remote.BrowserWindow;
const win = new BrowserWindow({
   show: false
});
*/
//let basepath = app.getAppPath();//C:\Users\Jameel\Desktop\pentachoron
const debug = true;
const logging = true;
let convertFrom = '';
let convertTo = '';
let userFilePath = '';
let canceled = false;
function setFile(filePath) {
    dLog(filePath);
    userFilePath = filePath;
    checkVisibleButton();
}
function setFileFromBtn() {
    let fileInput = document.getElementById("fileInput");
    userFilePath = fileInput.files[0].path;
    fileInput.style.width = "auto";
    dLog(userFilePath);
    checkVisibleButton();
}
function convert() {
    let pdfPath = userFilePath;
    //Ensure correct platform
    var isWin = process.platform === "win32";
    if (isWin) {
        document.getElementById('holder').style.display = 'none';
        document.getElementById('processing').style.display = 'block';
        setModalBtn('cancel');
        //document.getElementById("path").style.display = 'none';
        start(pdfPath);
    }
    else {
        error("Windows only");
    }
}
function start(pdfPath) {
    return __awaiter(this, void 0, void 0, function* () {
        if (checkCancel())
            return;
        log("Starting");
        dLog(pdfPath);
        let split = pdfPath.split('.');
        if (split.length > 1) {
            log("Parsing Filename");
            let extention = split[split.length - 1].toUpperCase();
            switch (extention) {
                case 'PDF':
                    log("Got PDF");
                    log("Clearing Files");
                    clearLastFiles();
                    let imageNamesArr;
                    try {
                        yield convertPDFToImages(pdfPath);
                    }
                    catch (err) {
                        error(err);
                    }
                    try {
                        if (checkCancel())
                            return;
                        imageNamesArr = yield getImageFilenames();
                    }
                    catch (err) {
                        error(err);
                    }
                    try {
                        if (checkCancel())
                            return;
                        yield tesseract(imageNamesArr);
                        //combineTextFiles("output.txt")
                    }
                    catch (err) {
                        error(err);
                    }
                    break;
                default:
                    error(extention + " Not Supported");
            }
            if (checkCancel()) {
                dLog("UnCanceled");
                canceled = false;
                return;
            }
            log("Done");
            setModalBtn('reset');
        }
        else {
            //No file extention or hidden file (eg .pdf)
            error("Filetype Not Supported");
        }
        //let fileExtention = split[split.length - 1]
    });
}
function convertPDFToImages(pdf) {
    return __awaiter(this, void 0, void 0, function* () {
        if (checkCancel())
            return;
        log("Converting PDF To Images");
        return new Promise(function (resolve, reject) {
            let sOutputFile = path.join(__dirname, ...['output', "images/%03d.jpg"]);
            let command = `start /B Ghostscript/bin/gswin64c.exe -dNOPAUSE -sDEVICE=jpeg -r200 -dJPEGQ=60 -sOutputFile=${sOutputFile} ${pdf} -dBATCH`;
            //console.log(command);
            exec(command, function (error, stdout, stderr) {
                dLog(stdout);
                dLog(stderr);
                if (error !== null) {
                    reject(error);
                }
                else {
                    resolve();
                }
            });
        });
    });
}
function tesseract(imageNamesArr) {
    return __awaiter(this, void 0, void 0, function* () {
        if (checkCancel())
            return;
        log("Scanning Images");
        document.getElementById("progress").style.display = "block";
        document.getElementById("writeLocation").style.display = "block";
        dLog(imageNamesArr);
        let outputTextFile = path.join(__dirname, ...['output', 'text', 'ocr']);
        let outputFolder = path.join(__dirname, ...['output', 'text']);
        document.getElementById("writeLocation").innerHTML = `Files being written to ${outputFolder}`;
        let cnt = 1;
        let numImagesToDecode = imageNamesArr.length;
        let progressIncrement = 1 / numImagesToDecode;
        let currentProgress = 0;
        for (let imageName of imageNamesArr) {
            let ret = yield decodeImage(imageName, outputTextFile, cnt);
            dLog(ret);
            cnt++;
            currentProgress += progressIncrement;
            setProgress(currentProgress);
        }
        document.getElementById("progress").style.display = "none";
    });
}
function decodeImage(imageName, outputTextFile, num) {
    return __awaiter(this, void 0, void 0, function* () {
        if (checkCancel())
            return;
        return new Promise(function (resolve, reject) {
            let command = `start /B Tesseract-OCR/tesseract.exe ${imageName} ${outputTextFile}${num}`;
            //dLog(command)
            console.log("===================");
            exec(command, function (error, stdout, stderr) {
                dLog(stdout);
                dLog(stderr);
                resolve(stdout);
                if (error !== null) {
                    console.log('exec error: ' + error);
                }
            });
        });
    });
}
function combineTextFiles(newFileName) {
    if (checkCancel())
        return;
    log("Mergeing Text Files");
    let dir = path.join(__dirname, ...['output', 'text']);
    let text_files = fs.readdirSync(dir);
    let newFilePath = path.join(__dirname, ...['output', newFileName]);
    fs.writeFile(newFilePath, 'Pentachoron @ 2019\n', function (err) {
        if (err)
            throw err;
    });
    for (let file of text_files) {
        let textFileData;
        fs.readFileSync(newFilePath, function (err, data) {
            log("!@#");
            log(data);
            if (err)
                throw err;
            textFileData = data;
        });
        fs.appendFileSync(newFilePath, textFileData, function (err) {
            if (err)
                throw err;
        });
        /*
        fs.unlink(path.join(__dirname,...['output','text',file]), function (err) {
          if (err) throw err;
        });
        */
    }
}
/*
function writeImageFilenames() {
    let command = 'ls ./output/images/*.jpg > output/imageNames.txt'//May have to change
    exec(command, function (error, stdout, stderr) {
        if (error !== null) {
             error('exec error: ' + error);
        }
        else {
            //cb('output/imageNames.txt')
        }
    });
}
*/
function getImageFilenames() {
    if (checkCancel())
        return;
    log("Getting Image Filenames");
    return new Promise(function (resolve, reject) {
        let dir = path.join(__dirname, ...['output', 'images']);
        var fileContents;
        try {
            fileContents = fs.readdirSync(dir);
            let files = fileContents.map(file => {
                return path.join(__dirname, ...['output', 'images', file]);
            });
            resolve(files);
        }
        catch (err) {
            reject(err);
        }
    });
}
function clearLastFiles() {
    if (checkCancel())
        return;
    log("Clearing Previous Files");
    let dir = path.join(__dirname, ...['output', 'images']);
    const image_files = fs.readdirSync(dir);
    for (let filePath of image_files) {
        fs.unlink(`${dir}/${filePath}`, (err) => {
            if (err)
                error(err);
        });
    }
    dir = path.join(__dirname, ...['output', 'text']);
    let text_files = fs.readdirSync(dir);
    for (let filePath of text_files) {
        fs.unlink(`${dir}/${filePath}`, (err) => {
            if (err)
                error(err);
        });
    }
}
function setVisualFilePath(path) {
    document.getElementById("path").innerHTML = path;
}
function log(msg) {
    if (logging) {
        console.log(msg);
        document.getElementById("instruction").innerHTML = msg;
    }
}
function dLog(msg) {
    if (debug)
        console.log(msg);
}
function error(msg) {
    console.error(msg);
}
function setProgress(progress) {
    /*
    if(win)
        win.setProgressBar(progress)
    */
    document.getElementById("progressBar").value = progress * 100;
    document.getElementById("progressBar").innerHTML = `${progress * 100}%`;
}
function setConvertFrom() {
    convertFrom = document.getElementById("convertFrom").value;
    if (convertFrom !== '') {
        document.getElementById('holder').style.display = 'flex';
        document.getElementById("fileTypeName").innerHTML = convertFrom;
    }
    else {
        document.getElementById('holder').style.display = 'none';
    }
    checkVisibleButton();
}
function setConvertTo() {
    convertTo = document.getElementById("convertTo").value;
    if (convertTo !== '') {
    }
    else {
    }
    checkVisibleButton();
}
function checkVisibleButton() {
    if (convertFrom !== '' && convertTo !== '' && userFilePath !== '') {
        setModalBtn('convert');
    }
    else {
        setModalBtn('none');
    }
}
function cancel() {
    canceled = true;
    setModalBtn('canceling');
}
function checkCancel() {
    if (canceled) {
        log("Canceling");
        reset();
        return true;
    }
    return false;
}
function reset() {
    log("Reset");
    convertFrom = '';
    convertTo = '';
    userFilePath = '';
    document.getElementById('holder').style.display = 'flex';
    document.getElementById("writeLocation").innerHTML = '';
    setModalBtn('convert');
}
function setModalBtn(btn) {
    dLog(btn);
    switch (btn) {
        case 'convert':
            document.getElementById('convertBtn').style.display = 'block';
            document.getElementById('cancelBtn').style.display = 'none';
            document.getElementById('resetBtn').style.display = 'none';
            document.getElementById('canceling').style.display = 'none';
            break;
        case 'cancel':
            document.getElementById('convertBtn').style.display = 'none';
            document.getElementById('cancelBtn').style.display = 'block';
            document.getElementById('resetBtn').style.display = 'none';
            document.getElementById('canceling').style.display = 'none';
            break;
        case 'reset':
            document.getElementById('convertBtn').style.display = 'none';
            document.getElementById('cancelBtn').style.display = 'none';
            document.getElementById('resetBtn').style.display = 'block';
            document.getElementById('canceling').style.display = 'none';
            break;
        case 'canceling':
            document.getElementById('convertBtn').style.display = 'none';
            document.getElementById('cancelBtn').style.display = 'none';
            document.getElementById('resetBtn').style.display = 'none';
            document.getElementById('canceling').style.display = 'block';
            break;
        case 'none':
            document.getElementById('convertBtn').style.display = 'none';
            document.getElementById('cancelBtn').style.display = 'none';
            document.getElementById('resetBtn').style.display = 'none';
            document.getElementById('canceling').style.display = 'none';
            break;
        default:
    }
}
