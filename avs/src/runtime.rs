use crate::structs::Symbol;
use crate::constants::*;
use fnv::FnvHashMap;



// Ordered by their symbol ID for table lookup
#[cfg(not(target_os = "unknown"))]
pub const RESERVED_SYMBOLS: [&'static Symbol; 28] = [ 
    &SYMBOL_COMMA, &SYMBOL_EQUALS,
    &SYMBOL_OR, &SYMBOL_AND, &SYMBOL_NOT, 
    &SYMBOL_DBL_EQUALS, &SYMBOL_NOT_EQUALS, 
    &SYMBOL_LT, &SYMBOL_LTE, &SYMBOL_GT, &SYMBOL_GTE,
    &SYMBOL_PLUS, &SYMBOL_MINUS, &SYMBOL_MULTIPLY, &SYMBOL_DIVIDE, &SYMBOL_MODULO,
    &SYMBOL_DOT, 
    &SYMBOL_OPEN_PAREN, &SYMBOL_CLOSE_PAREN, 
    &SYMBOL_OPEN_SQBR, &SYMBOL_CLOSE_SQBR, 
    &SYMBOL_OPEN_BRACE, &SYMBOL_CLOSE_BRACE, 
    &SYMBOL_COLON, &SYMBOL_SEMI_COLON, 
    &SYMBOL_TRUE, &SYMBOL_FALSE, &SYMBOL_NONE,
];

// Exclude from WASM code
#[cfg(not(target_os = "unknown"))]
lazy_static! {


    // Used during printing
    pub static ref ID_SYMBOL_MAP: FnvHashMap<u64, &'static Symbol> = {
        let mut m = FnvHashMap::with_capacity_and_hasher(30, Default::default());
        
        for symbol in RESERVED_SYMBOLS.iter() {
            m.insert(symbol.symbol, *symbol);
        }

        // Internal signal. Defined here for recognition by interpreter. 
        // Not defined in SYMBOL_ID_MAP because it's not meant to be used frontend.
        m.insert(SYMBOL_CALL_FN.symbol, &SYMBOL_CALL_FN);

        // Built in functions
        // m.insert(AV_FN_MIN, "min");
        // m.insert(AV_FN_MAX, "max");
        // m.insert(AV_FN_ABS, "abs");
        // m.insert(AV_FN_CEIL, "ceil");
        // m.insert(AV_FN_FLOOR, "floor");
        // m.insert(AV_FN_TRUNC, "truncate");
        // m.insert(AV_FN_ROUND, "round");
        // m.insert(AV_FN_SQRT, "sqrt");


        // // Reserved HTTP words -
        // // TODO: These should be namespace under "request" once we have objects
        // // and dot notation
        // m.insert(AV_HTTP_PATH, "path");
        // m.insert(AV_HTTP_QUERY, "query");

        m
    };


    // Used during lexing
    pub static ref SYMBOL_ID_MAP: FnvHashMap<String, &'static Symbol> = {
        let mut m = FnvHashMap::with_capacity_and_hasher(30, Default::default());
        // Inverting automatically via a function doesn't allow us to automatically uppercase
        // because of unknown size at compile time. So we do it the hard way.
        
        for symbol in RESERVED_SYMBOLS.iter() {
            m.insert(symbol.name.to_string().to_uppercase(), *symbol);
        }


        // m.insert("OR", SYMBOL_OR);
        // m.insert("AND", SYMBOL_AND);
        // m.insert("IS", SYMBOL_IS);
        // m.insert("NOT", SYMBOL_NOT);
        
        // m.insert("<", SYMBOL_LT);
        // m.insert("<=", SYMBOL_LTE);
        // m.insert(">", SYMBOL_GT);
        // m.insert(">=", SYMBOL_GTE);

        // m.insert("+", SYMBOL_PLUS);
        // m.insert("-", SYMBOL_MINUS);
        // m.insert("*", SYMBOL_MULTIPLY);
        // m.insert("/", SYMBOL_DIVIDE);

        // m.insert("(", SYMBOL_OPEN_PAREN);
        // m.insert(")", SYMBOL_CLOSE_PAREN);

        // m.insert("[", SYMBOL_OPEN_SQBR);
        // m.insert("]", SYMBOL_CLOSE_SQBR);

        // m.insert("{", SYMBOL_OPEN_BRACE);
        // m.insert("}", SYMBOL_CLOSE_BRACE);

        // m.insert(",", SYMBOL_COMMA);
        // m.insert(":", SYMBOL_COLON);
        // m.insert(";", SYMBOL_SEMI_COLON);
        // m.insert(".", SYMBOL_DOT);

        // m.insert("=", SYMBOL_EQUALS);

        // m.insert("TRUE", SYMBOL_TRUE);
        // m.insert("FALSE", SYMBOL_FALSE);
        // m.insert("NONE", SYMBOL_NONE);



        // m.insert("MIN", AV_FN_MIN);
        // m.insert("MAX", AV_FN_MAX);
        // m.insert("ABS", AV_FN_ABS);
        // m.insert("CEIL", AV_FN_CEIL);
        // m.insert("FLOOR", AV_FN_FLOOR);
        // m.insert("TRUNCATE", AV_FN_TRUNC);
        // m.insert("ROUND", AV_FN_ROUND);
        // m.insert("SQRT", AV_FN_SQRT);

        // m.insert("REQUEST", AV_HTTP_REQUEST);
        // m.insert("PATH", AV_HTTP_PATH);
        // m.insert("QUERY", AV_HTTP_QUERY);

        m
    };


    // Guidelines:
    // Write errors for humans, not computers. No ParseError 0013: Err at line 2 col 4.
    // Sympathize with the user. Don't blame them (avoid 'your'). This may be their first exposure to programming.
    // Help them recover if possible. (Largely a TODO once we have error pointers)
    // https://uxplanet.org/how-to-write-good-error-messages-858e4551cd4
    // Alas - match doesn't work for this. These sholud be ordered by expected frequency.
    pub static ref ERR_MSG_MAP: FnvHashMap<u64, &'static str> = {
        let mut m = FnvHashMap::with_capacity_and_hasher(25, Default::default());

        m.insert(RUNTIME_ERR, "There was a mysterious error while running this code.");
        m.insert(PARSE_ERR, "Arevel couldn't understand this expression.");
        m.insert(INTERPRETER_ERR, "There was an unknown error while interpreting this code.");
        m.insert(PARSE_ERR_UNTERM_STR, "Arevel couldn't find where this string ends. Make sure the text has matching quotation marks.");
        m.insert(PARSE_ERR_INVALID_FLOAT, "This decimal number is in a weird format.");
        m.insert(PARSE_ERR_UNKNOWN_TOKEN, "There's an unknown token in this expression.");
        m.insert(PARSE_ERR_UNEXPECTED_TOKEN, "There's a token in an unexpected location in this expression.");
        m.insert(PARSE_ERR_UNMATCHED_PARENS, "Arevel couldn't find where the brackets end. Check whether all opened brackets are closed.");
        m.insert(PARSE_ERR_UNK_SYMBOL, "Arevel didn't recognize the symbol.");
        m.insert(RUNTIME_ERR_INVALID_TYPE, "That data type doesn't work with this operation.");
        m.insert(RUNTIME_ERR_TYPE_NAN, "This operation doesn't work with not-a-number (NaN) values.");
        m.insert(RUNTIME_ERR_EXPECTED_NUM, "Arevel expects a number here.");
        m.insert(RUNTIME_ERR_EXPECTED_BOOL, "Arevel expects a true/false boolean here.");
        m.insert(RUNTIME_ERR_UNK_VAL, "The code tried to read from an unknown value.");
        m.insert(RUNTIME_ERR_CIRCULAR_DEP, "There's a circular reference between these cells.");
        m.insert(RUNTIME_ERR_EXPECTED_STR, "Arevel expects some text value here.");
        m.insert(RUNTIME_ERR_DIV_Z, "Dividing by zero is undefined. Make sure the denominator is not a zero before dividing.");

        // TODO
        m.insert(RUNTIME_ERR_FN_UNK, "Unknown function");
        m.insert(RUNTIME_ERR_FN_ARITY, "Unexpected number of parameters.");
        m.insert(RUNTIME_ERR_FN_EXPECTED, "Arevel expect a valid function here.");

        m
    };

}



#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_symbol_order() {
        // The RESERVED_SYMBOLS list is meant to be ordered by the symbol ID
        // so it can be used as a fast lookup table for precedence, function mappings, etc.
        // Verify this order is preserved in future modifications

        let mut index = 0;
        for symbol in RESERVED_SYMBOLS.iter() {
            let symbol_value = symbol.symbol & PAYLOAD_MASK;
            assert_eq!(symbol_value, index);
            index += 1;
        }
    }

}