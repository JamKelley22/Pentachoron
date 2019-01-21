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
var shell = electron.shell;
var path = require('path');
var { dialog } = remote;
const debug = true;
const logging = true;
let convertFrom = '';
let convertTo = '';
let userFilePath = '';
let canceled = false;
let isWindowsSystem = false;
let outputTextFile = path.join(__dirname, ...['output', 'text', '0']);
let outputFolder = path.join(__dirname, ...['output', 'text']);
let mergedTextOutputName = 'output.txt';
let errorLogPath = path.join(__dirname, ...['Logs', 'error.log']);
let logFilePath = path.join(__dirname, ...['Logs', 'log.log']);
init();
function init() {
    dLog("\n==========Open==========\n");
    checkPlatform();
    setFelix();
}
function setFelix() {
    let felix = document.getElementById("logo");
    let hatArr = [
        "svgs/beanie.svg",
        "svgs/bow.svg",
        "svgs/fez.svg",
        "svgs/topHat.svg",
        "svgs/none.svg"
    ];
    let randomNum = getRandomInt(0, hatArr.length - 1);
    dLog(randomNum);
    dLog(hatArr[randomNum]);
    felix.src = hatArr[randomNum];
}
function getRandomInt(min, max) {
    min = Math.ceil(min);
    max = Math.floor(max);
    return Math.floor(Math.random() * (max - min + 1)) + min;
}
function setFile(filePath) {
    dLog("setFile");
    dLog(filePath);
    userFilePath = filePath;
    checkVisibleButton();
}
function setFileFromBtn() {
    dLog("setFileFromBtn");
    let fileInput = document.getElementById("fileInput");
    userFilePath = fileInput.files[0].path;
    fileInput.style.width = "auto";
    dLog(userFilePath);
    checkVisibleButton();
}
function convert() {
    dLog("convert");
    if (isWindowsSystem) {
        document.getElementById('holder').style.display = 'none';
        document.getElementById('processing').style.display = 'block';
        setModalBtn('cancel');
        start(userFilePath);
    }
    else {
        error("Error: Windows only software");
    }
}
function start(pdfPath) {
    return __awaiter(this, void 0, void 0, function* () {
        dLog("start");
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
                        yield combineTextFiles(mergedTextOutputName);
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
            shell.showItemInFolder(path.join(__dirname, ...['output', mergedTextOutputName]));
            remote.getCurrentWindow().setProgressBar(-1);
            shell.beep();
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
        dLog("convertPDFToImages");
        if (checkCancel())
            return;
        log("Converting PDF To Images");
        return new Promise(function (resolve, reject) {
            let sOutputFile = path.join(__dirname, ...['output', "images/%03d.jpg"]);
            let command = `start /B resources/Ghostscript/bin/gswin64c.exe -dNOPAUSE -sDEVICE=jpeg -r200 -dJPEGQ=60 -sOutputFile=${sOutputFile} ${pdf} -dBATCH`;
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
let avgTimeForDecode = 0;
let totalSecElapsed = 0;
let secRemaining = 0;
function tesseract(imageNamesArr) {
    return __awaiter(this, void 0, void 0, function* () {
        dLog("tesseract");
        if (checkCancel())
            return;
        log("Scanning Images");
        setProgress(0);
        document.getElementById("progress").style.display = "block";
        document.getElementById("writeLocation").style.display = "block";
        document.getElementById("openFileLocation").style.display = "block";
        dLog(imageNamesArr);
        document.getElementById("writeLocation").innerHTML = `Files being written to ${outputFolder}`;
        let cnt = 1;
        let numImagesToDecode = imageNamesArr.length;
        let progressIncrement = 1 / numImagesToDecode;
        let currentProgress = 0;
        let intervalId = setInterval(updateTimeRemaining, 1000);
        for (let imageName of imageNamesArr) {
            let startTime = Date.now();
            let ret = yield decodeImage(imageName, outputTextFile, cnt);
            let endTime = Date.now();
            let elapsedTimeSec = Math.abs(endTime - startTime) / 1000;
            totalSecElapsed += elapsedTimeSec;
            avgTimeForDecode = totalSecElapsed / cnt;
            //avgTimeForDecode = (avgTimeForDecode + elapsedTimeSec) / cnt;
            //dLog(`avgTimeForDecode: ${avgTimeForDecode}`)
            secRemaining = avgTimeForDecode * (numImagesToDecode - cnt); //Avg time * num remaining
            //dLog(`secRemaining: ${secRemaining}`)
            dLog(ret);
            cnt++;
            currentProgress += progressIncrement;
            setProgress(currentProgress);
        }
        document.getElementById("progress").style.display = "none";
        clearInterval(intervalId);
    });
}
function updateTimeRemaining() {
    dLog("updateTimeRemaining");
    secRemaining--;
    dLog(secRemaining);
    if (secRemaining > 60) {
        document.getElementById("timeRemaining").innerHTML = `Estimated Time Remaining ${Math.floor(secRemaining / 60)} minutes ${Math.round(secRemaining % 60)} seconds`;
    }
    else if (secRemaining > 1) {
        document.getElementById("timeRemaining").innerHTML = `Estimated Time Remaining ${Math.round(secRemaining)} seconds`;
    }
    else {
        document.getElementById("timeRemaining").innerHTML = `Estimating Time Remaining`;
    }
}
function decodeImage(imageName, outputTextFile, num) {
    return __awaiter(this, void 0, void 0, function* () {
        dLog("decodeImage");
        if (checkCancel())
            return;
        return new Promise(function (resolve, reject) {
            let command = `start /B resources/Tesseract-OCR/tesseract.exe ${imageName} ${outputTextFile}${num}`;
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
    dLog("combineTextFiles");
    if (checkCancel())
        return;
    log("Mergeing Text Files");
    let dir = path.join(__dirname, ...['output', 'text']);
    let text_files = fs.readdirSync(dir);
    text_files = text_files.sort(compareParseNumbers);
    let newFilePath = path.join(__dirname, ...['output', newFileName]);
    fs.writeFileSync(newFilePath, 'Pentachoron @ 2019\n', function (err) {
        if (err)
            throw err;
    });
    dLog(text_files);
    for (let file of text_files) {
        let textFileData;
        dLog(path.join(__dirname, ...['output', 'text', file]));
        dLog(file);
        dLog("Test");
        try {
            let fileContents = fs.readFileSync(path.join(__dirname, ...['output', 'text', file]));
            fs.appendFileSync(newFilePath, fileContents);
        }
        catch (err) {
            error(err);
        }
        /*
        await fs.readFile(path.join(__dirname,...['output','text',file]), function(err, data) {
            dLog("Here")
            if (err) throw err;
            
            dLog(data)
            fs.appendFile(newFilePath, data, function (err) {
                if (err) throw err;
            });
        });
        */
        /*
        fs.unlink(path.join(__dirname,...['output','text',file]), function (err) {
          if (err) throw err;
        });
        */
    }
}
let compareParseNumbers = function compareNumbers(a, b) {
    dLog("compareParseNumbers");
    return parseInt(a.split(".")[0]) - parseInt(b.split(".")[0]);
};
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
    dLog("getImageFilenames");
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
    dLog("clearLastFiles");
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
    dLog("setVisualFilePath");
    document.getElementById("path").innerHTML = path;
}
function log(msg) {
    if (logging) {
        console.log(msg);
        let ins = document.getElementById("instruction");
        ins.style.color = 'black';
        ins.innerHTML = msg;
    }
}
function dLog(msg) {
    if (debug)
        console.log(msg);
    fs.appendFile(logFilePath, `${Date.now()}: ${msg}\n`, () => { });
}
function error(msg) {
    console.error(msg);
    if (logging) {
        let ins = document.getElementById("instruction");
        ins.style.color = 'red';
        ins.innerHTML = msg;
    }
    fs.appendFile(errorLogPath, `${Date.now()}: ${msg}\n`, () => { });
}
function setProgress(progress) {
    dLog("setProgress");
    remote.getCurrentWindow().setProgressBar(progress);
    document.getElementById("progressBar").value = progress * 100;
    document.getElementById("progressPercent").innerHTML = `${Math.round(progress * 100)}%`;
}
function setConvertFrom() {
    dLog("setConvertFrom");
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
    dLog("setConvertTo");
    convertTo = document.getElementById("convertTo").value;
    if (convertTo !== '') {
    }
    else {
    }
    checkVisibleButton();
}
function checkVisibleButton() {
    dLog("checkVisibleButton");
    if (convertFrom !== '' && convertTo !== '' && userFilePath !== '') {
        setModalBtn('convert');
    }
    else {
        setModalBtn('none');
    }
}
function openFileLocation() {
    shell.openItem(path.join(__dirname, ...['output']));
}
function cancel() {
    dLog("cancel");
    canceled = true;
    setModalBtn('canceling');
}
function checkCancel() {
    dLog("checkCancel");
    if (canceled) {
        log("Canceling");
        document.getElementById("openFileLocation").style.display = "none";
        reset();
        return true;
    }
    return false;
}
function reset() {
    dLog("reset");
    log("Reset");
    remote.getCurrentWindow().setProgressBar(-1);
    document.getElementById('holder').style.display = 'flex';
    document.getElementById("writeLocation").innerHTML = '';
    document.getElementById("openFileLocation").style.display = "none";
    setModalBtn('convert');
}
function setModalBtn(btn) {
    dLog("setModalBtn");
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
function checkPlatform() {
    dLog("checkPlatform");
    dLog("checkPlatform");
    //Ensure correct platform
    var isWin = process.platform === "win32";
    if (isWin) {
        isWindowsSystem = true;
    }
    else {
        error("Error: Windows only software");
    }
}
