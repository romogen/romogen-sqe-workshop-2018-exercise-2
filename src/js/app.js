import $ from 'jquery';
import {parseCode, getPaintRowsOfSubstitutedFunction} from './code-analyzer';
import * as escodegen from 'escodegen';
import * as esprima from 'esprima';


$(document).ready(function () {
    $('#codeSubmissionButton').click(() => {
        let codeToParse = $('#codePlaceholder').val();
        let parsedCode = parseCode(codeToParse);
        let valuesArray = $('#valuesArray').val().split(',');
        if(valuesArray.length !== 1 || valuesArray[0] !== '')
            valuesArray = valuesArray.map(x => eval(x));
        else
            valuesArray = [];
        let substitutedCode = escodegen.generate(parsedCode);
        let paintList = getPaintRowsOfSubstitutedFunction(esprima.parseScript(substitutedCode,
            {range: true}), valuesArray);
        document.getElementById('parsedCodeDiv').innerHTML = '<p>' +
            replaceSpaceEnter(paintCode(substitutedCode, paintList)) + '</p>';
    });
});

const replaceSpaceEnter = (paintedCode) => {
    paintedCode = paintedCode.split('\n').join('<br>');
    return paintedCode.split('    ').join('&nbsp;&nbsp;&nbsp;&nbsp;');
};

const createColoredText = (codeString, paintStruct) => {
    let prefixText = '';
    if(paintStruct['isTrue']){ // green
        prefixText += '<mark style="background-color: green">';
    } else{ // red
        prefixText += '<mark style="background-color: red">';
    }
    return prefixText + codeString.substring(paintStruct['startIndex'], paintStruct['endIndex']) + '</mark>';
};

/*const splitTextByPaintList = (codeString, sortedPaintList) => {
    let splittedText = [];
    let last = sortedPaintList.length - 1;
    if(sortedPaintList.length === 0)
        return [codeString];
    splittedText.push(codeString.substring(0, sortedPaintList[0]['startIndex']));
    for (let i = 0; i < sortedPaintList.length ; i++)
        splittedText.push(createColoredText(codeString, sortedPaintList[i]));
    splittedText.push(codeString.substring(sortedPaintList[last]['endIndex'], codeString.length));
    return splittedText;
};*/

const paintCode = (codeString, paintList) => {
    let sortedPaintList = paintList.sort((a,b) => (a['startIndex'] > b['startIndex']) ? 1 :
        ((b['startIndex'] > a['startIndex']) ? -1 : 0));
    let splittedText = [];
    let last = sortedPaintList.length - 1;
    if(sortedPaintList.length === 0)
        return codeString;
    splittedText.push(codeString.substring(0, sortedPaintList[0]['startIndex']));
    for (let i = 0; i < sortedPaintList.length ; i++) {
        splittedText.push(createColoredText(codeString, sortedPaintList[i]));
        if(i !== sortedPaintList.length - 1)
            splittedText.push(codeString.substring(sortedPaintList[i]['endIndex'], sortedPaintList[i+1]['startIndex']));
    }
    splittedText.push(codeString.substring(sortedPaintList[last]['endIndex'], codeString.length));
    return splittedText.join('');
};