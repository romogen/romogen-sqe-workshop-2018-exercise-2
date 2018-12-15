import * as escodegen from 'escodegen';
import * as esprima from 'esprima';

// TODO: remove redundant zeros from expressions
// TODO: handle arrayExpression like [x, 1, y+2]

function isContainNonLiter_HandleArray(valueJSON) {
    let ans = false;
    for (let i = 0; i < valueJSON['elements'].length; i++)
        ans = ans || isContainNonLiteral(valueJSON['elements'][i]);
    return ans;
}

const isContainNonLiteral = (valueJSON) => {
    if(valueJSON['type'] === 'BinaryExpression'){
        return isContainNonLiteral(valueJSON['left']) || isContainNonLiteral(valueJSON['right']);
    } else if(valueJSON['type'] === 'ArrayExpression'){
        return isContainNonLiter_HandleArray(valueJSON);
    }
    return valueJSON['type'] === 'Identifier';
};

const generateVariablesDecelerations = (varMap) => {
    let generatedString = '';
    for (let i = 0 ; i < varMap.length ; i++){
        if(!isContainNonLiteral(varMap[i]['value']))
            generatedString += escodegen.generate(varMap[i]['value']) + ';';
    }
    return generatedString;
};

const myEval = (expressionString , varMap) => {
    let varsDecelerationsString = generateVariablesDecelerations(varMap);
    return eval(varsDecelerationsString + expressionString);
};

const createParamSub = (paramName) => {
    return {'name': paramName,'value': {'type': 'Identifier', 'name': paramName}, 'param': true};

};

const changeRelevantVariable = (property, knownSubs, i, newValue) => {
    if (property == null)
        knownSubs[i]['value'] = newValue;
    else {
        let sub = substituteExpression(property, knownSubs);
        let propertyVal = myEval(escodegen.generate(sub), knownSubs.flat(10));
        knownSubs[i]['value']['elements'][propertyVal] = newValue;
    }
    return knownSubs;
};

const updateVariableValue = (varName, newValue, knownSubs, property=null) => {
    let canonSubIndex = -1;
    for (let i = 0 ; i<knownSubs.length ; i++){
        if (!Array.isArray(knownSubs[i])){
            if(knownSubs[i]['name'] === varName){
                return changeRelevantVariable(property, knownSubs, i, newValue);
            }
        }
        else{ // is canonical sub
            canonSubIndex = i;
        }
    }
    if(canonSubIndex !== -1)
        knownSubs[canonSubIndex] = updateVariableValue(varName, newValue, knownSubs[canonSubIndex]);
    return knownSubs;
};

const isFunctionParameter = (varName, knownSubs) => {
    let canonSub = [];
    for (let i = 0 ; i<knownSubs.length ; i++){
        if (!Array.isArray(knownSubs[i])){
            if(knownSubs[i]['name'] === varName){
                return knownSubs[i]['param'] === true;
            }
        }
        else{ // is canonical sub
            canonSub = knownSubs[i];
        }
    }
    if(canonSub.length === 0)
        return null;
    return isFunctionParameter(varName, canonSub);
};

// coverage checked
const getUpperSub = (knownSubs) => {
    for (let i = 0; i < knownSubs.length ; i++) {
        if (Array.isArray(knownSubs[i]))
            return knownSubs[i];
    }
    return null;

};

const getRelevantVal = (i, knownSubs, property) => {
    if (property == null)
        return knownSubs[i]['value'];
    /*else if(knownSubs[i]['param']) {

    } */else {
        let sub = substituteExpression(property, knownSubs);
        let propertyVal = myEval(escodegen.generate(sub), knownSubs.flat(10));
        return knownSubs[i]['value']['elements'][propertyVal];
    }
};

const getSubVal = (varName, knownSubs, property=null) => {
    let canonSub = [];
    for (let i = 0 ; i<knownSubs.length ; i++){
        if (!Array.isArray(knownSubs[i])){
            if(knownSubs[i]['name'] === varName){
                return getRelevantVal(i, knownSubs, property);
            }
        }
        else{ // is canonical sub
            canonSub = knownSubs[i];
        }
    }
    if(canonSub.length === 0)
        return null;
    return getSubVal(varName, canonSub);
};

const createReturnStruct = (esprimaArr, knownSubs) => {
    return {'esprima': esprimaArr, 'knownSubs': knownSubs};
};

/*const getMostLeftForFix = (expressionJSON) => {
    if(expressionJSON['type'] !== 'BinaryExpression' ||
        (expressionJSON['operator'] !== '+' && expressionJSON['operator'] !== '-'))
        return expressionJSON;
    return getMostLeftForFix(expressionJSON['left']);
};

const putAtMostLeft = (expressionJSON, newLeft) => {
    if(expressionJSON['type'] !== 'BinaryExpression' ||
        (expressionJSON['operator'] !== '+' && expressionJSON['operator'] !== '-')){
        return newLeft;
    }
    expressionJSON['left'] = putAtMostLeft(expressionJSON['left'], newLeft);
    return expressionJSON;
};

const fixExpression = (expressionJSON) => {
    if (expressionJSON['type'] !== 'BinaryExpression')
        return expressionJSON;
    else if (expressionJSON['operator'] !== '+') {
        expressionJSON['left'] = fixExpression(expressionJSON['left']);
        expressionJSON['right'] = fixExpression(expressionJSON['right']);
        return expressionJSON;
    } else { // if it is +
        expressionJSON['left'] = fixExpression(expressionJSON['left']);
        expressionJSON['right'] = fixExpression(expressionJSON['right']);
        if (expressionJSON['right']['type'] !== 'BinaryExpression')
            return expressionJSON;

        let mostLeft = getMostLeftForFix(expressionJSON['right']);
        let newExpression = expressionJSON['right'];
        expressionJSON['right'] = mostLeft;
        return putAtMostLeft(newExpression, expressionJSON);
    }
};*/

// checked coverage
const substituteExpression = (JSONExpression, knownSubs) => {
    //return fixExpression(JSON.parse(JSON.stringify(substituteExpression_inner(JSONExpression, knownSubs))));
    return substituteExpression_inner(JSONExpression, knownSubs);

    /*let newExpression = substituteExpression_inner(JSONExpression, knownSubs);
    let newExpressionString = escodegen.generate(newExpression);
    try{
        let newExpressionEval = myEval(newExpressionString, knownSubs.flat(10));
        let newExprParse = esprima.parseScript(newExpressionEval.toString());
        return newExprParse['body'][0];
    }catch(err){
        return newExpression;
    }*/
};

// checked coverage
// TODO: maybe add 'UnaryExpression' ?
const substituteExpression_inner = (JSONExpression, knownSubs) => {
    if(JSONExpression['type'] === 'BinaryExpression'){
        JSONExpression['left'] = substituteExpression_inner(JSONExpression['left'], knownSubs);
        JSONExpression['right'] = substituteExpression_inner(JSONExpression['right'], knownSubs);
        return JSONExpression;
    } else if (JSONExpression['type'] === 'Identifier'){
        return getSubVal(JSONExpression['name'], knownSubs);
    } else if (JSONExpression['type'] === 'MemberExpression'){
        if(!isFunctionParameter(JSONExpression['object']['name'], knownSubs))
            return getSubVal(JSONExpression['object']['name'], knownSubs, JSONExpression['property']);
        else{
            JSONExpression['property'] = substituteExpression_inner(JSONExpression['property'], knownSubs);
            return JSONExpression;
        }
    } else{ // type == Literal
        return JSONExpression;
    }
};

// checked coverage
const handleProgram = (parsedCodeJSON, knownSubs) => {
    let newBody = [];
    for (let x = 0; x < parsedCodeJSON['body'].length ; x++) {
        let currBodyObjectAns = getSubstitutedJSON(parsedCodeJSON['body'][x], knownSubs);
        newBody = newBody.concat(currBodyObjectAns['esprima']);
        knownSubs = currBodyObjectAns['knownSubs'];
    }

    parsedCodeJSON['body'] = newBody;
    return parsedCodeJSON;
};

// checked coverage
const handleVariableDeclaration = (parsedCodeJSON, knownSubs) => {
    for (let x = 0; x < parsedCodeJSON['declarations'].length ; x++){
        knownSubs.push({'name': parsedCodeJSON['declarations'][x]['id']['name'],
            'value': substituteExpression(parsedCodeJSON['declarations'][x]['init'], knownSubs)});
    }
    return createReturnStruct([], knownSubs);
};

// checked coverage
const handleWhileStatement = (parsedCodeJSON, knownSubs) => {
    parsedCodeJSON['test'] = substituteExpression(parsedCodeJSON['test'], knownSubs);
    let bodySubStruct = getSubstitutedJSON(parsedCodeJSON['body'], [knownSubs]);
    parsedCodeJSON['body'] = bodySubStruct['esprima'][0];
    return createReturnStruct([parsedCodeJSON], getUpperSub(bodySubStruct['knownSubs']));
};

// checked coverage
const handleExpressionMember = (parsedCodeJSON, knownSubs) => {
    if(isFunctionParameter(parsedCodeJSON['expression']['left']['object']['name'], knownSubs)){ // need to stay
        parsedCodeJSON['expression']['left']['property'] = substituteExpression(
            parsedCodeJSON['expression']['left']['property'],
            knownSubs);
        parsedCodeJSON['expression']['right'] = substituteExpression(
            parsedCodeJSON['expression']['right'],
            knownSubs);
        return createReturnStruct([parsedCodeJSON], knownSubs);
    }
    else{ //is local, need to go, update knownSubs
        return createReturnStruct([], updateVariableValue(parsedCodeJSON['expression']['left']['object']['name'],
            substituteExpression(parsedCodeJSON['expression']['right'], knownSubs),
            knownSubs, parsedCodeJSON['expression']['left']['property']));
    }
};

// checked coverage
const handleExpressionVariable = (parsedCodeJSON, knownSubs) => {
    if(isFunctionParameter(parsedCodeJSON['expression']['left']['name'], knownSubs)){ // need to stay
        parsedCodeJSON['expression']['right'] = substituteExpression(parsedCodeJSON['expression']['right'], knownSubs);
        return createReturnStruct([parsedCodeJSON], knownSubs);
    }
    else{ //is local, need to go, update knownSubs
        return createReturnStruct([], updateVariableValue(parsedCodeJSON['expression']['left']['name'],
            substituteExpression(parsedCodeJSON['expression']['right'], knownSubs),
            knownSubs));
    }
};

// checked coverage
const handleExpressionStatement = (parsedCodeJSON, knownSubs) => {
    if(parsedCodeJSON['expression']['left']['type'] === 'MemberExpression'){
        return handleExpressionMember(parsedCodeJSON, knownSubs);
    }
    else{
        return handleExpressionVariable(parsedCodeJSON, knownSubs);
    }
};
/*if(isFunctionParameter(parsedCodeJSON['expression']['left']['name'], knownSubs)){ // need to stay
        parsedCodeJSON['expression']['right'] = substituteExpression(parsedCodeJSON['expression']['right'], knownSubs);
        return createReturnStruct([parsedCodeJSON], knownSubs);
    }
    else{ //is local, need to go, update knownSubs
        if(parsedCodeJSON['expression']['left']['type'] === 'MemberExpression')
            return createReturnStruct([], updateVariableValue(parsedCodeJSON['expression']['left']['object']['name'],
                substituteExpression(parsedCodeJSON['expression']['right'], knownSubs),
                knownSubs, parsedCodeJSON['expression']['left']['property']));
        return createReturnStruct([], updateVariableValue(parsedCodeJSON['expression']['left']['name'],
            substituteExpression(parsedCodeJSON['expression']['right'], knownSubs),
            knownSubs));
    }*/

//checked coverage
const handleBlockStatement = (parsedCodeJSON, knownSubs) => {
    let newBody = [];
    for (let x = 0; x < parsedCodeJSON['body'].length ; x++) {
        let currBodyObjectAns = getSubstitutedJSON(parsedCodeJSON['body'][x], knownSubs);
        newBody = newBody.concat(currBodyObjectAns['esprima']);
        knownSubs = currBodyObjectAns['knownSubs'];
    }

    parsedCodeJSON['body'] = newBody;
    return createReturnStruct([parsedCodeJSON], knownSubs);
};

// checked coverage
const handleFunctionDeclaration = (parsedCodeJSON, knownSubs) => {
    let innerKnownSubs = [knownSubs];
    for (let i = 0 ; i < parsedCodeJSON['params'].length ; i++){
        innerKnownSubs.push(createParamSub(parsedCodeJSON['params'][i]['name']));
    }

    let bodySubStruct = getSubstitutedJSON(parsedCodeJSON['body'], innerKnownSubs);
    parsedCodeJSON['body'] = bodySubStruct['esprima'][0];
    return createReturnStruct([parsedCodeJSON], getUpperSub(bodySubStruct['knownSubs']));
};

// checked coverage
const handleReturnStatement = (parsedCodeJSON, knownSubs) => {
    parsedCodeJSON['argument'] = substituteExpression(parsedCodeJSON['argument'], knownSubs);
    return createReturnStruct([parsedCodeJSON], knownSubs);
};

// checked coverage
const handleIfStatement = (parsedCodeJSON, knownSubs) => {
    let clonedKnownSubs = JSON.parse(JSON.stringify(knownSubs));

    parsedCodeJSON['test'] = substituteExpression(parsedCodeJSON['test'], knownSubs);

    let consSubStruct = getSubstitutedJSON(parsedCodeJSON['consequent'], [knownSubs]);
    parsedCodeJSON['consequent'] = consSubStruct['esprima'][0];

    knownSubs = JSON.parse(JSON.stringify(clonedKnownSubs));

    if(parsedCodeJSON['alternate'] !== null) {
        let altSubStruct = getSubstitutedJSON(parsedCodeJSON['alternate'], [knownSubs]);
        parsedCodeJSON['alternate'] = altSubStruct['esprima'][0];
    }

    return createReturnStruct([parsedCodeJSON], clonedKnownSubs);
};

const functionsDict = {
    'Program': handleProgram,
    'ExpressionStatement': handleExpressionStatement,
    'WhileStatement': handleWhileStatement,
    'BlockStatement': handleBlockStatement,
    'FunctionDeclaration': handleFunctionDeclaration,
    'VariableDeclaration': handleVariableDeclaration,
    'ReturnStatement': handleReturnStatement,
    'IfStatement': handleIfStatement
    /*
    'ForStatement': handleForStatement*/
};

//checked coverage
const getSubstitutedJSON = (parsedJSON, knownSubs=[]) => {
    let relevantFunction = functionsDict[parsedJSON['type']];
    return relevantFunction(parsedJSON, knownSubs);
};

//checked coverage
const parseCode = (codeToParse) => {
    return getSubstitutedJSON(esprima.parseScript(codeToParse));
};

/*const parseCode = (codeToParse) => {
    return esprima.parseScript(codeToParse/!*, {range: true}*!/);
};*/


/*****************
 *  Here Start The Part Where We Paint Ifs
 * ***************/
const generateVariablesDecelerations_Paint = (varMap) => {
    let generatedString = '', varNames = Object.keys(varMap);
    for (let i = 0 ; i < varNames.length ; i++){
        generatedString += 'let ' + varNames[i] + ' = ' + varMap[varNames[i]] + ';';
    }
    return generatedString;
};

const myEval_Paint = (expressionString , varMap) => {
    let varsDecelerationsString = generateVariablesDecelerations_Paint(varMap);
    return eval(varsDecelerationsString + expressionString);
};
const checkIfExpressionTrue = (originalText, expressionJSON, valuesMap) => {
    let expressionString = originalText.substring(expressionJSON['range'][0], expressionJSON['range'][1]);
    return myEval_Paint(expressionString, valuesMap);
};

const getStartOfRowIndex = (originalText, testJSON) => {
    for(let i = testJSON['range'][0] ; i >= 0 ; i--){
        if(originalText.charAt(i) === '\n')
            return i+1;
    }
    return 0;
};

const getEndOfRowIndex = (originalText, testJSON) => {
    for(let i = testJSON['range'][0] ; i < originalText.length ; i++){
        if(originalText.charAt(i) === '\n')
            return i;
    }
    return originalText.length;
};

/*const handleVariableDeclaration_Paint = (originalText, parsedCodeJSON, valuesMap) => {
    return [];
};*/

//checked coverage
const handleWhileStatement_Paint = (originalText, parsedCodeJSON, valuesMap) => {
    return getPaintRows(originalText, parsedCodeJSON['body'], valuesMap);
};

//checked coverage
const handleExpressionStatement_Paint = () => {
    return [];
};

// checked coverage
const handleBlockStatement_Paint = (originalText, parsedCodeJSON, valuesMap) => {
    let paintRows = [];
    for (let x = 0; x < parsedCodeJSON['body'].length ; x++) {
        paintRows = paintRows.concat(getPaintRows(originalText, parsedCodeJSON['body'][x], valuesMap));
    }
    return paintRows;
};

//checked coverage
const handleFunctionDeclaration_Paint = (originalText, parsedCodeJSON, valuesMap) => {
    return getPaintRows(originalText, parsedCodeJSON['body'], valuesMap);
};

//checked coverage
const handleReturnStatement_Paint = () => {
    return [];
};

const handleIfStatement_Paint = (originalText, parsedCodeJSON, valuesMap) => {
    let returnedPaintArray = [], isTrue;

    isTrue = checkIfExpressionTrue(originalText, parsedCodeJSON['test'], valuesMap);
    returnedPaintArray.push({'startIndex': getStartOfRowIndex(originalText, parsedCodeJSON['test']),
        'endIndex': getEndOfRowIndex(originalText, parsedCodeJSON['test']), 'isTrue': isTrue});

    returnedPaintArray = returnedPaintArray.concat(getPaintRows(originalText, parsedCodeJSON['consequent'], valuesMap));

    if(parsedCodeJSON['alternate'] !== null) {
        returnedPaintArray = returnedPaintArray.concat(getPaintRows(originalText, parsedCodeJSON['alternate'], valuesMap));
    }

    return returnedPaintArray;
};

const functionsDict_Paint = {
    'ExpressionStatement': handleExpressionStatement_Paint,
    'WhileStatement': handleWhileStatement_Paint,
    'BlockStatement': handleBlockStatement_Paint,
    'FunctionDeclaration': handleFunctionDeclaration_Paint,
    /*'VariableDeclaration': handleVariableDeclaration_Paint,*/
    'ReturnStatement': handleReturnStatement_Paint,
    'IfStatement': handleIfStatement_Paint
};

const getPaintRows = (originalText, parsedJSON, knownSubs=[]) => {
    let relevantFunction = functionsDict_Paint[parsedJSON['type']];
    return relevantFunction(originalText, parsedJSON, knownSubs);
};

const getPaintRowsOfSubstitutedFunction = (parseCodeJSON, valuesArray) => {
    let functionJSON = parseCodeJSON['body'][0], valuesMap = {};
    for (let i = 0 ; i < functionJSON['params'].length ; i++)
        valuesMap[functionJSON['params'][i]['name']] = valuesArray[i];
    return getPaintRows(escodegen.generate(parseCodeJSON), functionJSON, valuesMap);
};


export {parseCode, getPaintRowsOfSubstitutedFunction};
