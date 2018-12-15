import assert from 'assert';
import {parseCode, getPaintRowsOfSubstitutedFunction} from '../src/js/code-analyzer';
import * as esprima from 'esprima';
import * as escodegen from 'escodegen';

describe('examples with adjusted parenthesis- ', () => {
    it('#1', () => {
        assert.deepEqual(
            parseCode('function foo(x, y, z){\n' +
                '    let a = x + 1;\n' +
                '    let b = a + y;\n' +
                '    let c = 0;\n' +
                '    \n' +
                '    if (b < z) {\n' +
                '        c = c + 5;\n' +
                '        return x + y + z + c;\n' +
                '    } else if (b < z * 2) {\n' +
                '        c = c + x + 5;\n' +
                '        return x + y + z + c;\n' +
                '    } else {\n' +
                '        c = c + z + 5;\n' +
                '        return x + y + z + c;\n' +
                '    }\n' +
                '}\n'),
            esprima.parseScript('function foo(x, y, z){\n' +
                '    if (x + 1 + y < z) {\n' +
                '        return x + y + z + (0 + 5);\n' +
                '    } else if (x + 1 + y < z * 2) {\n' +
                '        return x + y + z + (0 + x + 5);\n' +
                '    } else {\n' +
                '        return x + y + z + (0 + z + 5);\n' +
                '    }\n' +
                '}\n')
        );
    });
    it('#2', () => {
        assert.deepEqual(
            parseCode('function foo(x, y, z){\n' +
                '    let a = x + 1;\n' +
                '    let b = a + y;\n' +
                '    let c = 0;\n' +
                '    \n' +
                '    while (a < z) {\n' +
                '        c = a + b;\n' +
                '        z = c * 2;\n' +
                '    }\n' +
                '    \n' +
                '    return z;\n' +
                '}\n'),
            esprima.parseScript('function foo(x, y, z){\n' +
                '    while (x + 1 < z) {\n' +
                '        z = (x + 1 + (x + 1 + y)) * 2;\n' +
                '    }\n' +
                '    \n' +
                '    return z;\n' +
                '}\n')
        );
    });
});

describe('simple tests - ', () => {
    it('parsing an empty function correctly', () => {
        assert.equal(
            JSON.stringify(parseCode('')),
            '{"type":"Program","body":[],"sourceType":"script"}'
        );
    });

    it('parsing a simple variable declaration correctly', () => {
        assert.equal(
            JSON.stringify(parseCode('let b = 1; let a = b + 1;')),
            '{"type":"Program","body":[],"sourceType":"script"}'
        );
    });

    it('parsing a simple function with variables', () => {
        assert.deepEqual(
            parseCode('function a(x, y, z) {let a = x; return a+y+z;}'),
            esprima.parseScript('function a(x, y, z) { return x + y + z; }')
        );
    });

    it('parsing a function with while', () => {
        assert.deepEqual(
            parseCode('function a(x, y, z) {let a = x; while( x < 10) { x = a + y; y = y + 1; } return x+y+z;}'),
            esprima.parseScript('function a(x, y, z) { while( x < 10) { x = x + y; y = y + 1; } return x + y + z; }')
        );
    });

    it('parsing a function with array substitution', () => {
        assert.deepEqual(
            parseCode('function a() {let b = [1,2]; return b[0];}'),
            esprima.parseScript('function a() {return 1;}')
        );
    });

    it('parsing a function with complicated expression', () => {
        assert.deepEqual(
            parseCode('function a(x, y) {let b = [1,2], a = 1, c=x, d = y+2; return b[0] + a + c + 1 + y + d;}'),
            esprima.parseScript('function a(x, y) {return 1 + 1 + x + 1 + y + (y + 2);}')
        );
    });

    it('parsing a function with variable ExpressionStatement', () => {
        assert.deepEqual(
            parseCode('function a(x, y) {let aa = 0; aa = 2; return aa;}'),
            esprima.parseScript('function a(x, y) {return 2;}')
        );
    });

    it('parsing a function with array type variable ExpressionStatement', () => {
        assert.deepEqual(
            parseCode('function a(x, y) {let aa = [0, 1]; aa[0] = 1; return aa;}'),
            esprima.parseScript('function a(x, y) {return [1,1];}')
        );
    });

    it('parsing a function with array type parameter ExpressionStatement', () => {
        assert.deepEqual(
            parseCode('function a(x) {let y = 1; x[y] = 2; return x[1-y];}'),
            esprima.parseScript('function a(x) {x[1] = 2; return x[1 - 1];}')
        );
    });

    it('parsing a function with parameter ExpressionStatement', () => {
        assert.deepEqual(
            parseCode('function a(x, y) {x = 1+y; return x+y;}'),
            esprima.parseScript('function a(x, y) {x = 1+y; return x+y;}')
        );
    });

    it('parsing a function with simple if', () => {
        assert.deepEqual(
            parseCode('function a(x, y) {let a = 1; if (x < a) {return y;} return -y;}'),
            esprima.parseScript('function a(x, y) {if (x < 1) {return y;} return -y;}')
        );
    });

    it('parsing a function with simple if-else', () => {
        assert.deepEqual(
            parseCode('function a(x, y) {let a = 1; if (x < a) {return y;} else {return -y;}}'),
            esprima.parseScript('function a(x, y) {if (x < 1) {return y;} else {return -y;}}')
        );
    });

    it('parsing a function with simple if-else if-else', () => {
        assert.deepEqual(
            parseCode('function a(x, y) {let a = 1; if (x < a) {return y;} else if (x == a)'+
                '{return -y;} else {return 0;}}'),
            esprima.parseScript('function a(x, y) {if (x < 1) {return y;} else if (x == 1)' +
                '{return -y;} else {return 0;}}')
        );
    });
});

describe('simple tests coloring- ', () => {
    it('coloring empty function', () => {
        assert.deepEqual(
            getPaintRowsOfSubstitutedFunction(esprima.parseScript('function a() {}'), []),
            []
        );
    });

    it('coloring simple function with parameters', () => {
        assert.deepEqual(
            getPaintRowsOfSubstitutedFunction(esprima.parseScript('function a(x, y) {return x+y;}'), [1,2]),
            []
        );
    });

    it('coloring function with while', () => {
        assert.deepEqual(
            getPaintRowsOfSubstitutedFunction(esprima.parseScript('function a(x, y) {'+
                ' while(x < 1) {x = x + 1;} return x+y;}'), [1,2]),
            []
        );
    });

    it('coloring function with if=false', () => {
        assert.deepEqual(
            getPaintRowsOfSubstitutedFunction(makeFunctionForPaint('function a(x, y) {'+
                ' if(x < 1) {x = x + 1;} return x+y;}'), [1,2]),
            [{'startIndex': 19, 'endIndex': 35, 'isTrue': false}]
        );
    });

    it('coloring function with if=true', () => {
        assert.deepEqual(
            getPaintRowsOfSubstitutedFunction(makeFunctionForPaint('function a(x, y) {'+
                ' if(x < 1) {x = x + 1;} return x+y;}'), [0,2]),
            [{'startIndex': 19, 'endIndex': 35, 'isTrue': true}]
        );
    });

    it('coloring function with if-else if=false', () => {
        assert.deepEqual(
            getPaintRowsOfSubstitutedFunction(makeFunctionForPaint('function a(x, y) {'+
                ' if(x < 1) {x = x + 1;} else { x = x*2;} return x+y;}'), [1,2]),
            [{'startIndex': 19, 'endIndex': 35, 'isTrue': false}]
        );
    });

    it('coloring function with if-else if=true', () => {
        assert.deepEqual(
            getPaintRowsOfSubstitutedFunction(makeFunctionForPaint('function a(x, y) {'+
                ' if(x < 1) {x = x + 1;} else { x = x*2;} return x+y;}'), [0,2]),
            [{'startIndex': 19, 'endIndex': 35, 'isTrue': true}]
        );
    });

    it('coloring function with if-else if-else if=false, else if=true', () => {
        assert.deepEqual(
            getPaintRowsOfSubstitutedFunction(makeFunctionForPaint('function a(x, y) {'+
                ' if(x < 1) {x = x + 1;} else if(x == 1) { x = x*2;} else {x = x/2;} return x+y;}'), [1,2]),
            [{'startIndex': 19, 'endIndex': 35, 'isTrue': false},
                {'startIndex': 55, 'endIndex': 79, 'isTrue': true}]
        );
    });

    it('coloring function with if-else if-else if=false, else if=false', () => {
        assert.deepEqual(
            getPaintRowsOfSubstitutedFunction(makeFunctionForPaint('function a(x, y) {'+
                ' if(x < 1) {x = x + 1;} else if(x == 1) { x = x*2;} else {x = x/2;} return x+y;}'), [2,2]),
            [{'startIndex': 19, 'endIndex': 35, 'isTrue': false},
                {'startIndex': 55, 'endIndex': 79, 'isTrue': false}]
        );
    });

    it('coloring function with if-else if-else if=true', () => {
        assert.deepEqual(
            getPaintRowsOfSubstitutedFunction(makeFunctionForPaint('function a(x, y) {'+
                ' if(x < 1) {x = x + 1;} else if(x == 1) { x = x*2;} else {x = x/2;} return x+y;}'), [0,2]),
            [{'startIndex': 19, 'endIndex': 35, 'isTrue': true},
                {'startIndex': 55, 'endIndex': 79, 'isTrue': false}]
        );
    });
});

const makeFunctionForPaint = (functionForPaint) => {
    return esprima.parseScript(escodegen.generate(esprima.parseScript(functionForPaint)), {range: true});
};