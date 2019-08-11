use crate::structs::Atom;
use crate::constants::*;
use fnv::FnvHashMap;
use core::fmt;


// Exclude from WASM code
#[cfg(not(target_os = "unknown"))]
lazy_static! {

    // Used during printing
    pub static ref ID_SYMBOL_MAP: FnvHashMap<u64, &'static str> = {
        let mut m = FnvHashMap::with_capacity_and_hasher(25, Default::default());

        // Lowercase since they usually appear within sentences.
        m.insert(SYMBOL_OR, "or");
        m.insert(SYMBOL_AND, "and");
        m.insert(SYMBOL_IS, "is");
        m.insert(SYMBOL_NOT, "not");
        
        m.insert(SYMBOL_LT, "<");
        m.insert(SYMBOL_LTE, "<=");
        m.insert(SYMBOL_GT, ">");
        m.insert(SYMBOL_GTE, ">=");

        m.insert(SYMBOL_PLUS, "+");
        m.insert(SYMBOL_MINUS, "-");
        m.insert(SYMBOL_MULTIPLY, "*");
        m.insert(SYMBOL_DIVIDE, "/");

        m.insert(SYMBOL_OPEN_PAREN, "(");
        m.insert(SYMBOL_CLOSE_PAREN, ")");

        m.insert(SYMBOL_OPEN_SQBR, "[");
        m.insert(SYMBOL_CLOSE_SQBR, "]");

        m.insert(SYMBOL_OPEN_BRACE, "{");
        m.insert(SYMBOL_CLOSE_BRACE, "}");

        m.insert(SYMBOL_COMMA, ",");
        m.insert(SYMBOL_COLON, ":");
        m.insert(SYMBOL_SEMI_COLON, ";");

        m.insert(SYMBOL_EQUALS, "=");

        // Additional keywords - Title case like nouns
        m.insert(SYMBOL_TRUE, "True");
        m.insert(SYMBOL_FALSE, "False");
        m.insert(SYMBOL_NONE, "None");

        m
    };


    // Used during lexing
    pub static ref SYMBOL_ID_MAP: FnvHashMap<&'static str, u64> = {
        // TODO: Sepcify different hasher
        let mut m = FnvHashMap::with_capacity_and_hasher(25, Default::default());
        // Inverting automatically via a function doesn't allow us to automatically uppercase
        // because of unknown size at compile time. So we do it the hard way.
        
        m.insert("OR", SYMBOL_OR);
        m.insert("AND", SYMBOL_AND);
        m.insert("IS", SYMBOL_IS);
        m.insert("NOT", SYMBOL_NOT);
        
        m.insert("<", SYMBOL_LT);
        m.insert("<=", SYMBOL_LTE);
        m.insert(">", SYMBOL_GT);
        m.insert(">=", SYMBOL_GTE);

        m.insert("+", SYMBOL_PLUS);
        m.insert("-", SYMBOL_MINUS);
        m.insert("*", SYMBOL_MULTIPLY);
        m.insert("/", SYMBOL_DIVIDE);

        m.insert("(", SYMBOL_OPEN_PAREN);
        m.insert(")", SYMBOL_CLOSE_PAREN);

        m.insert("[", SYMBOL_OPEN_SQBR);
        m.insert("]", SYMBOL_CLOSE_SQBR);

        m.insert("{", SYMBOL_OPEN_BRACE);
        m.insert("}", SYMBOL_CLOSE_BRACE);

        m.insert(",", SYMBOL_COMMA);
        m.insert(":", SYMBOL_COLON);
        m.insert(";", SYMBOL_SEMI_COLON);


        m.insert("=", SYMBOL_EQUALS);

        m.insert("TRUE", SYMBOL_TRUE);
        m.insert("FALSE", SYMBOL_FALSE);
        m.insert("NONE", SYMBOL_NONE);

        m
    };

}

#[cfg(not(target_os = "unknown"))]
pub fn repr_symbol(symbol: &u64) -> String {
    let builtin_name = ID_SYMBOL_MAP.get(symbol);
    if builtin_name.is_some(){
        format!("{}", builtin_name.unwrap())
    } else {
        format!("{:X}", symbol)
    }
}


#[cfg(not(target_os = "unknown"))]
pub fn repr_atom(atom: &Atom) -> String {
    match atom {
        Atom::NumericValue(num) => {
            format!("{}", num)
        },
        Atom::StringValue(str_val) => {
            format!("\"{}\"", str_val)
        }
        Atom::SymbolValue(symbol) => {
            repr_symbol(symbol)
        },
        Atom::ObjectValue(obj_val) => {
            format!("{}", obj_val.id)
        },
        Atom::HashMapValue(map_val) => {
            format!("{:#?}", map_val)
        }
    }
}

#[cfg(not(target_os = "unknown"))]
impl fmt::Debug for Atom {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        write!(f, "{}", repr_atom(&self))
    }
}
