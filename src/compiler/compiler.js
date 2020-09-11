/* 
Compiler / Interpreter which consumes the AST generated by parser
and either evaluates or generates bytecode
*/

import { JS_PRE_CODE, JS_POST_CODE } from "@appassembly/shared/constants"
import { syntaxError, TOKEN_HEADER, TOKEN_COND, CONTINUE_BLOCK } from "./parser";
import { getNodeText } from "@appassembly/shared/ast"

var treeify = require('treeify');


const BINARY_OPS = {
    "and": "__aa_and",
    "or": "__aa_or",    
    "+": "__aa_add",
    "-": "__aa_sub",
    "*": "__aa_multiply",
    "/": "__aa_divide",
    "%": "__aa_mod",
    "<": "__aa_lt",
    ">": "__aa_gt",
    "<=": "__aa_lte",
    ">=": "__aa_gte",
    "==": "__aa_eq",
    "!=": "__aa_neq"
}

const UNARY_OPS = {
    "-": "__aa_uminus",
    "not": "__aa_not"
}

class Expr {
    constructor(cell, node) {
        // Store context relevant to this expression type
        this.cell = cell;
        this.node = node;
    }
    emitJS(target, gen) { 
        // Emits a js version of the expression and return a reference to it
        // target: Backend specific code emitter
        // gen: Language specific code generator
        console.log("Emit JS not implemented for " + typeof this);
        console.log(this);
    }
    evaluate() { 
        // Evaluates the Expression and returns the result
        console.log("Evaluated not implemented for " + typeof this);
    }
    static parse(cell, node) { 
        // Should parse the relevant bits from the node into a structure
        // Returns Expr node of given type
        console.log("Parse not implemented for " + this)
    }
}

class BinaryExpr extends Expr {
    constructor(cell, node, left, right) {
        super(cell, node)
        // Expressions
        this.left = left;
        this.right = right;
        this.operator = BINARY_OPS[node.operator.keyword]
    }
    emitJS(target) {
        let left = this.left.emitJS(target)
        let right = this.right.emitJS(target)
        return target.functionCall(this.operator, left, right)
    }
    debug() {
        return {
            "BinaryExpr": {
                operator: this.operator,
                left: this.left.debug(),
                right: this.right.debug()
            }
        }
    }
    static parse(cell, node) {
        let left = astToExpr(cell, node.left)
        let right = astToExpr(cell, node.right)
        return new BinaryExpr(cell, node, left, right);
    }
}

class UnaryExpr extends Expr {
    constructor(cell, node, left) {
        super(cell, node)
        this.left = left
        this.operator = UNARY_OPS[node.operator.keyword]
    }
    
    emitJS(target) {
        let left = this.left.emitJS(target)
        return target.functionCall(this.operator, left);
    }

    debug() {
        return {
            "UnaryExpr": {
                operator: this.operator,
                left: this.left.debug()
            }
        }        
    }

    static parse(cell, node) {
        let left = astToExpr(cell, node.left)
        return new UnaryExpr(cell, node, left)
    }
}

class LiteralExpr extends Expr {
    constructor(cell, node) {
        super(cell, node);
        // TODO: Type inference
    }
    debug() {
        return {
            "LiteralExpr": {
                value: this.node.value
            }
        }        
    }
    emitJS(target) {
        return target.literal(this.node.value)
    }
}

class IdentifierExpr extends Expr {
    constructor(cell, node) {
        super(cell, node);
    }
    debug() {
        return {
            "IdentifierExpr": {
                value: this.node.value
            }
        }        
    }    
    emitJS(target) {
        return target.identifier(this.node.value)
    }
}


class KeySignatureExpr extends Expr {
    // TODO: Optional_index and rest_params
    constructor(cell, node, name, type="null", params=[], guard=null) {
        super(cell, node);
        this.name = name;
        this.type = type;
        this.params = params;
        this.guard = guard;
    }

    emitJS(target) {
        // let paramSig = this.quoteParamJs(target);
        let paramSig = this.params instanceof ParamsExpr ? this.params.emitSignature(target) : "[]";
        let guardSig = this.guard ? this.guard.emitJS(target) : "null";
        let nameSig = this.name ? '"' + this.name + '"' : '""';

        return target.create("KeySignature", nameSig, "null", paramSig, guardSig);
    }

    getParamJS(target) {
        return this.params instanceof ParamsExpr ? this.params.emitJS(target) : [];
    }

    quoteParamJs(target) {
        return this.params instanceof ParamsExpr ? this.params.emitSignature(target) : "null";
    }

    debug() {
        let params;
        if(this.params instanceof ParamsExpr) {
            params = this.params.debug();
        } else if(Array.isArray(this.params)) {
            params = this.params.map((e) => e.debug())
        } else {
            params = []
        }

        return {
            "KeySignatureExpr": {
                name: this.name ? this.name : null,
                type: this.type ? this.type : null,
                params: params,
                guard: this.guard ? this.guard.debug() : null
            }
        }
    }    

    static parse(cell, node) {
        switch(node.node_type) {
            case "(identifier)":
                return new KeySignatureExpr(cell, node, node.value)
            case "(grouping)":
                var params = ParamsExpr.parse(cell, node);
                return new KeySignatureExpr(cell, node, "", "null", params)
            case "(guard)":
                var guard = GuardExpr.parse(cell, node);
                return new KeySignatureExpr(cell, node,  "", "null", guard.params, guard)
            default:
                // Note: Flat keys are not wrapped in a key signature.
                return astToExpr(cell, node)
        }
    }
}

// Any expression with a : - map, conditions, loops, etc.
class HeaderExpr extends Expr {

    static parse(cell, node) {
        if(Array.isArray(node.value)) {
            let [k, v] = node.value;
            if(k.node_type == TOKEN_COND) {
                return ConditionalExpr.parse(cell, node);
            } else {
                // key = astToExpr(cell, k);
                return MapExpr.parse(cell, node);
            }
        } else {
            return astToExpr(cell, node);
        }
    }
}

class MapEntryExpr extends Expr {
    constructor(cell, node, key, value) {
        super(cell, node);
        this.key = key;
        this.value = value;
    }

    getKeyJS(target) {
        if(this.key instanceof IdentifierExpr) {
            return '"' + this.key.emitJS(target) + '"'
        }
        // Else, it's a key sig
        return this.key.emitJS(target);
    }

    getValJS(target) {
        let valName = target.newVariable();
        let valJS;
        if(this.key instanceof KeySignatureExpr && this.key.params instanceof ParamsExpr) {
            let params = this.key.getParamJS(target);
            valJS = target.lambdaDeclaration(params, this.value.emitJS(target));
        }
        else {
            valJS = this.value.emitJS(target);
        }
        target.emit(target.declaration(valName, valJS + ";\n"));
        
        let repr = getNodeText(this.cell, this.value.node);
        target.emit(target.repr(valName, repr));
        return valName;
    }

    debug() {
        return {
            "MapEntryExpr": {
                key: this.key.debug(),
                value: this.value.debug()
            }
        }        
    }    

    static parse(cell, node) {
        let [k, v] = node.value;
        let key = KeySignatureExpr.parse(cell, k);
        let value = astToExpr(cell, v);
        return new MapEntryExpr(cell, node, key, value);
    }
}

class BlockExpr extends Expr {
    constructor(cell, node, expressions) {
        super(cell, node);
        this.expressions = expressions
    }

    emitJS(target) {
        let js = []
        this.expressions.forEach((expr) => {
            js.push(expr.emitJS(target))
        })
        return js;
    }

    debug() {
        return {
            "BlockExpr": {
                expressions: this.expressions.map((e) => e.debug())
            }
        }
    }

    static parse(cell, node) {
        let expressions = [];
        // The list of expressions may be made up of groups of sub-expressions
        // i.e. if-else chains, maps, etc. Iterate over it and break it up into groups.

        let subBlock = null;

        node.value.forEach((expr) => {
            // Terminating conditions for sub-blocks.
            if(subBlock == null || !("append" in subBlock) || !subBlock.append(cell, expr)) {
                // Will return false if it's not a valid node that can be added.
                // End-current block
                if(subBlock) { expressions.push(subBlock); }

                // Start new block based on the first key type.
                subBlock = HeaderExpr.parse(cell, expr);

            }
        })
        if(subBlock) {
            expressions.push(subBlock);
        }
        
        return new BlockExpr(cell, node, expressions);
    }
}

class MapExpr extends Expr {
    constructor(cell, node, kv_list) {
        super(cell, node);
        this.kv_list = kv_list;
    }

    emitJS(target) {
        let mapName = target.newVariable();
        let obj = target.create("Obj");
        target.emit(target.declaration(mapName, obj) + ";\n")

        this.kv_list.forEach((kv) => {
            target.emit(target.method(mapName, "insert", kv.getKeyJS(target), kv.getValJS(target)) + ";\n")
        })
        return mapName;
    }

    append(cell, node) {
        // TODO: Additional validation.
        // if(node.node_type == TOKEN_HEADER) {
            this.kv_list.push(MapEntryExpr.parse(cell, node))
            return true
        // }
        // return false
    }

    debug() {
        return {
            MapExpr: {
                kv_list: this.kv_list.map((e) => e.debug())
            }
        }
    }

    static parse(cell, node) {
        let kv_list = [MapEntryExpr.parse(cell, node)]
        // Array of key-value tuples
        // let kv_list = node.value.map( (kv_node) => {
        //     console.log(kv_node)
        //     if(kv_node.node_type != TOKEN_HEADER) { syntaxError("Unexpected node found in map " + kv_node)}
        //     return MapEntryExpr.parse(cell, kv_node)
        // });

        return new MapExpr(cell, node, kv_list)
    }
}

class ArrayExpr extends Expr {
    constructor(cell, node, elements) {
        super(cell, node)
        this.elements = elements;
        this.range_expr = null;
    }
    emitJS(target) {
        if(this.range_expr == null) {
            let elements_js = this.elements.map((elem) => elem.emitJS(target))
            return target.functionCall("Stream.array", target.array(elements_js))
        } else {
            return this.range_expr.emitJS(target);
        }
    }

    debug() {
        return {
            ArrayExpr: {
                elements: this.elements.map((e) => e.debug())
            }
        }
    }    
    static parse(cell, node) {
        let axp = new ArrayExpr(cell, node, []);
        axp.elements = node.value.map((elem) => {
            let elemNode = astToExpr(cell, elem);
            if(elemNode instanceof RangeExpr) {
                if(axp.range_expr !== null) {
                    syntaxError("Multiple range expressions found in array")
                }
                axp.range_expr = elemNode;
                elemNode.arr = axp;
            }

            return elemNode
        })
        return axp;
    }
}

class RangeExpr extends Expr {
    constructor(cell, node, left=null, right=null) {
        super(cell, node);
        this.left = left;
        this.right = right;
        this.arr = null;
    }
    emitJS(target) {

        let inclusive = this.node.inclusive ? true : false;
        let rangeIndex = this.arr.elements.indexOf(this);
        let before = this.arr.elements.slice(0, rangeIndex);
        if(this.left) {
            before.push(this.left);
        }
        
        let after = this.arr.elements.slice(rangeIndex + 1)
        if(this.right) {
            after.unshift(this.right);  // prepend
        }


        return target.functionCall("Stream.generate", 
        target.array(before.map((e) => e.emitJS(target)) ), 
        target.array(after.map((e) => e.emitJS(target))), 
        inclusive )
    }

    debug() {
        return {
            RangeExpr: {
                left: this.left ? this.left.debug() : "null",
                right: this.right ? this.right.debug() : "null",
            }
        }
    }

    static parse(cell, node) {
        let left = node.left ? astToExpr(cell, node.left) : null;
        let right = node.right ? astToExpr(cell, node.right) : null;
        return new RangeExpr(cell, node, left, right)
    }
}

class FilteringExpr extends Expr {
    constructor(cell, node, arr, filter) {
        super(cell, node);
        this.arr = arr;
        this.filter = filter;
    }

    emitJS(target){
        return target.method(this.arr.emitJS(target), "get", this.filter.emitJS(target))
    }

    debug() {
        return {
            FilteringExpr: {
                arr: this.arr.debug(),
                filter: this.filter.debug()
            }
        }
    }    

    static parse(cell, node) {
        let arr = astToExpr(cell, node.left);
        let filter = astToExpr(cell, node.value[0]);
        return new FilteringExpr(cell, node, arr, filter)
    }
}

class InvokeExpr extends Expr {
    // Call/Invoke a "function" ()
    constructor(cell, node, fn, params) {
        super(cell, node);
        this.fn = fn;
        this.params = params;
    }

    debug() {
        return {
            InvokeExpr: {
                fn: this.fn.debug(),
                params: this.params ? this.params.map((e) => e.debug()) : null
            }
        }
    }    

    emitJS(target) {
        let paramsJS = this.params.map((p) => p.emitJS(target))
        return target.functionCall("__aa_call", this.fn.emitJS(target), ...paramsJS)
    }

    static parse(cell, node) {
        let params = node.value.map((p) => astToExpr(cell, p))
        let fn = astToExpr(cell, node.left);
        return new InvokeExpr(cell, node, fn, params)
    }
}

class ConditionalClauseExpr extends Expr {
    constructor(cell, node, condition, body) {
        super(cell, node);
        this.condition = condition
        this.body = body;
        this.alternative = null;
    }

    setAlternative(alternative) {
        // Do not add if this is the last else clause
        if(this.isTerminal()) {
            return false
        }

        this.alternative = alternative;
        return true;
    }
    
    isTerminal() {
        // Condition is left blank for the terminal "else" clause.
        return this.condition === null
    }

    emitJS(target) {
        if(this.condition) {
            // if / else if clause
            let cond_code = this.condition.emitJS(target) + " ? " + this.body.emitJS(target) + " : "

            if(this.alternative) {
                cond_code += this.alternative.emitJS(target);
            } else {
                cond_code += " null "
            }

            return cond_code
        } else {
            // Else clause. No condition, just body.
            return this.body.emitJS(target)
        }
    }

    debug() {
        return {
            ConditionalClauseExpr: {
                condition: this.condition ? this.condition.debug() : null,
                body: this.body ? this.body.debug() : null,
                alternative: this.alternative ? this.alternative.debug() : null
            }
        }
    }    

    static parse(cell, node) {
        if(node.value.length == 2) {    // Tuple of Predicate, Body
            let predicateNode = node.value[0];
            if(predicateNode.node_type !== "(else)" && predicateNode.node_type !== "(else if)") {
                syntaxError("Unexpected node found in condition " + node.value[0])
            }

            // Extract the inner predicate clause condition from the predicate branch.
            let condition = astToExpr(cell, predicateNode.left);
            
            // assert: predicateNode.right & value are null.
            let body = astToExpr(cell, node.value[1]);
            return new ConditionalClauseExpr(cell, node, condition, body);
        } else {
            // Last else clause
            let body = astToExpr(cell, node.value[0]);
            return new ConditionalClauseExpr(cell, node, null, body);
        }
    }
}

class ConditionalExpr extends Expr {
    constructor(cell, node, conditions) {
        super(cell, node);
        this.conditions = conditions
    }

    emitJS(target) {
        // This will emit code for all of the chained branches.
        return this.conditions[0].emitJS(target);
    }

    append(cell, node) {
        // Disallow adding more clauses after the final "else" clause.
        if(this.conditions && this.conditions[this.conditions.length - 1].isTerminal()) {
            // console.log("Conditional node is terminal");
            // console.log(treeify.asTree(this.conditions[this.conditions.length - 1].debug(), true))
            return false;
        }

        if(node.node_type != TOKEN_HEADER) {    return false }
        
        // Validate - this is an else/else-if clause.
        if(node.value[0].node_type === "(else)" || node.value[0].node_type === "(else if)") {
            let branch = ConditionalClauseExpr.parse(cell, node);
            this.conditions[this.conditions.length - 1].alternative = branch;
            this.conditions.push(branch)
            return true;
        }

        return false
    }

    debug() {
        return {
            ConditionalClause: {
                conditions: this.conditions.map((e) => e.debug())
            }
        }
    }    

    static parse(cell, node) {
        // Ensure, first header node starts with an "if" clause. 
        if(node.value && node.value[0].node_type == "(if)") {
            let condition = astToExpr(cell, node.value[0].left);
            let body = astToExpr(cell, node.value[1]);
            let clauses = [new ConditionalClauseExpr(cell, node, condition, body)]
            return new ConditionalExpr(cell, node, clauses);
        } else {
            syntaxError("Unexpected node found in condition " + node)
        }
        // Further clauses will be added via append through the Header parse.
    }
}

class GuardExpr extends Expr {
    constructor(cell, node, condition, params) {
        super(cell, node);
        this.condition = condition;
        this.params = params;
    }

    emitJS(target) {
        let name = target.newVariable();
        let paramsJS = this.params instanceof ParamsExpr ? this.params.emitJS(target) : "null";
        let conditionBody = this.condition.emitJS(target)
        let guardFn = target.lambdaDeclaration(paramsJS, conditionBody)
        target.emit(target.declaration(name, guardFn));
        target.emit(target.repr(name, getNodeText(this.cell, this.condition.node)));

        return name;
    }

    debug() {
        return {
            GuardExpr: {
                condition: this.condition ? this.condition.debug() : null,
                params: this.params ? this.params.debug() : null
            }
        }
    }    

    static parse(cell, node) {
        if(node.right) {
            let condition = astToExpr(cell, node.right);
            let params = ParamsExpr.parse(cell, node.left);
            return new GuardExpr(cell, node, condition, params);
        } else {
            let condition = astToExpr(cell, node.left);
            let params = [];
            return new GuardExpr(cell, node, condition, params)
        }
    }
}

class ParamsExpr extends Expr {
    constructor(cell, node, params) {
        super(cell, node);
        this.params = params;
    }

    emitJS(target) {
        return this.params.map((p) => p.emitJS(target));
    }

    emitSignature(target) {
        let paramSigs = this.params.map((p) => target.create("KeySignature", '"' + p.emitJS(target) + '"'));
        return target.array(paramSigs)
    }

    debug() {
        return {
            ParamsExpr: {
                params: this.params.map((e) => e.debug())
            }
        }
    }    
    

    static parse(cell, node) {
        let params = node.value ? node.value.map((p) => astToExpr(cell, p)) : [];
        return new ParamsExpr(cell, node, params);
    }
}

class LoopExpr extends Expr {

}

class AssignmentExpr extends Expr {

}


class MemberExpr extends Expr {
    // Obj.attr dot access
    constructor(cell, node, obj, attr) {
        super(cell, node);
        this.obj = obj;
        this.attr = attr;
    }

    debug() {
        return {
            MemberExpr: {
                obj: this.obj.debug(),
                attr: this.attr.debug()
            }
        }
    }    


    emitJS(target) {
        // Quote the attribute name.
        return target.functionCall("__aa_attr", this.obj.emitJS(target), '"' + this.attr.emitJS(target) + '"')
    }

    static parse(cell, node) {
        let obj = astToExpr(cell, node.left);
        let attr = astToExpr(cell, node.right);
        return new MemberExpr(cell, node, obj, attr)
    }

}

// Grouping?
class CodeGen {}
class JSCodeGen extends CodeGen {
    constructor(env) {
        super()
        this.env = env;
        this.variable_count = 0;
        this.code = JS_PRE_CODE;
    }

    functionCall(fn, ...args) {
        return fn + "(" + args.join(",") + ")"
    }

    lambdaDeclaration(params, body) {
        if(Array.isArray(body)) {
            return `( ${params.join(",")} ) => {
                ${ body.slice(0, -1).join("\n") }
                return ${ body[body.length - 1] }
            }
            `
        } else {
            return `( ${params.join(",")} ) => {
                return ${ body }
            }
            `
        }
    }

    method(obj, fn, ...args) {
        return obj + "." + fn + "(" + args.join(",") + ")"
    }

    repr(obj, str) {
        return `${obj}.toString = () => ${str};\n`
    }

    create(cls, ...args) {
        return "new " + cls + "(" + args.join(",") + ")"
    }

    declaration(name, value) {
        return "var " + name + " = " + value;
    }

    literal(value) {
        return JSON.stringify(value)
    }

    identifier(name) {
        return name
    }

    array(elements) {
        return "[" + elements.join(",") + "]"
    }

    newVariable() {
        return "u_" + this.variable_count++;
    }

    emit(newCode) {
        this.code += newCode
    }

    emitTry() {
        this.emit("\ntry {\n");
    }

    emitCatchAll(cell) {
        this.emit(`} catch(err) {
            console.log(err); 
            ctx.setError("${cell.id}", err.message);
        }\n`);
    }
    
    emitCellResult(cell) {
        this.emit("\n");
        this.emit(
            this.functionCall('ctx.set', '"' + cell.id + '"', cell.getCellName()) + ";\n")
    }

    emitCellError(cell, error, ...err_args) {
        this.emit(
            this.functionCall(
                "ctx.set", 
                '"' + cell.id + '"', 
                this.error(error, ...err_args)
            ) + ";\n"
        )
    }

    error(err, ...args) {
        return "new " + err + "(" + args.join(",") + ")"
    }

    finalize() {
        this.code += JS_POST_CODE;
        return this.code
    }
}

export function astToExpr(cell, node) {

    // console.log("AST TO EXPR OF " + cell.id);
    if(!node || !node.node_type) { return undefined; }
    switch(node.node_type) {
        case "binary":
            return BinaryExpr.parse(cell, node)
        case "unary":
            return UnaryExpr.parse(cell, node)
        case "(literal)":
            return new LiteralExpr(cell, node)
        case "(identifier)":
            return new IdentifierExpr(cell, node)
        case "(grouping)": 
            if(node.value.length == 1) {
                // Swallow parens - order is explicit in the AST form
                return astToExpr(cell, node.value[0])
            } else {
                // TODO: These should probably be split up into a separate tuple node type.
                // return node.value.map((elem) => astToExpr(cell, elem))
                return KeySignatureExpr.parse(cell, node)
            }
            
        case "apply":       // todo, NAME
            return InvokeExpr.parse(cell, node)
        case "(array)":
            return ArrayExpr.parse(cell, node)
        case "(where)":
            return FilteringExpr.parse(cell, node)
        case "(member)":
            return MemberExpr.parse(cell, node)
        case TOKEN_HEADER:
            return HeaderExpr.parse(cell, node)
        case "maplist":     // todo, NAME
            // return MapExpr.parse(cell, node)
            return BlockExpr.parse(cell, node)
        case "(guard)":
            // Guards are wrapped in a key signature
            return KeySignatureExpr.parse(cell, node)
        case "(if)":
            return ConditionalExpr.parse(cell, node)
        case "(range)":
            return RangeExpr.parse(cell, node)
        default:
            syntaxError("Unknown AST node type: " + node.node_type);
    }
}

export function compileJS(env) {
    var target = new JSCodeGen(env);

    env.exprAll(env.root);
    env.debugAll(env.root);

    env.emitJS(env.root, target);

    return target.finalize()
}