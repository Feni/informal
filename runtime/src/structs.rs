use avs::utils::{create_string_pointer, create_pointer_symbol, create_value_symbol};
use avs::structs::Atom;
use avs::constants::*;
use fnv::FnvHashMap;
use crate::Result;
use core::fmt;


#[derive(Serialize, PartialEq, Debug)]
pub struct CellResponse {
    pub id: u64,
    pub output: String,
    pub error: String
}

#[derive(Serialize, PartialEq, Debug)]
pub struct EvalResponse {
    pub results: Vec<CellResponse>
}

#[derive(Deserialize,Debug)]
pub struct CellRequest {
    pub id: u64,
    pub input: String,
    pub name: Option<String>
}

#[derive(Deserialize,Debug)]
pub struct EvalRequest {
    pub body: Vec<CellRequest>
}


// Context (Scope / Global AST)
// Primary AST linked list structure
// Pure functions are scoped to their parameters. i.e. null parent.
// You can reference parent, but never child or sibiling data.
pub struct Context {
    pub parent: Box<Option<Context>>,
    
    // Normalized upper case name -> Symbol ID for things defined in this scope
    pub normname_symbols: FnvHashMap<String, u64>,

    // Preserve the original case of the name for printing back to user
    pub symbols_name: FnvHashMap<u64, String>,

    // (Root context only) Cell IDs -> Symbol IDs for cells without a name
    pub cell_symbols: Option<FnvHashMap<u64, u64>>,


    // (Root context only) Cell IDs -> Symbol IDs for cells without a name
    pub symbols_cell: Option<FnvHashMap<u64, u64>>,

    pub body: Vec<Expression>,

    // We could maintain multiple "next" indexes for each symbol type to maximize symbol-space
    // Keeping it simple for now.
    pub next_symbol_id: u64,
}

#[cfg(not(target_os = "unknown"))]
impl fmt::Debug for Context {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        let mut parts = vec![];
        parts.push(String::from("Context {\n"));

        parts.push(format!("Cells: {:#?}\n", self.cell_symbols));
        parts.push(format!("Names: {:#?}\n", self.symbols_name));
        parts.push(format!("Body: {:#?}\n", self.body));

        parts.push(String::from("\n}"));

        write!(f, "{}", parts.join(""))
    }
}


impl Context {
    pub fn new(next_symbol_id: u64) -> Context {
        return Context {
            parent: Box::new(None),
            normname_symbols: FnvHashMap::default(),
            symbols_name: FnvHashMap::default(),
            cell_symbols: None,
            symbols_cell: None,
            body: Vec::with_capacity(0),
            next_symbol_id: next_symbol_id,
        }
    }

    pub fn get_cell_symbol(&self, cell_id: u64) -> Option<&u64> {
        return self.cell_symbols.as_ref().unwrap().get(&cell_id);
    }

    pub fn get_name_symbol(&self, name: String) -> Option<&u64> {
        let norm_name = name.trim().to_uppercase();
        return self.normname_symbols.get(&norm_name);
    }

    pub fn get_symbol_repr(&self, symbol: u64) -> Option<&String> {
        return self.symbols_name.get(&symbol);
    }

    pub fn next_value_symbol(&mut self) -> u64 {
        // These symbols reference themselves
        let next_symbol: u64 = create_value_symbol( self.next_symbol_id );
        self.next_symbol_id += 1;
        return next_symbol;
    }
    
    pub fn next_string_symbol(&mut self, _value: String) -> u64 {
        // TODO: Encode length in symbol
        let next_symbol: u64 = create_string_pointer( self.next_symbol_id );
        self.next_symbol_id += 1;
        return next_symbol;
    }

    pub fn next_pointer(&mut self) -> u64 {
        let next_symbol: u64 = create_pointer_symbol(self.next_symbol_id);
        self.next_symbol_id += 1;
        return next_symbol;
    }

    // TODO: Methods for defining a child scope
    pub fn get_or_create_cell_symbol(&mut self, cell_id: u64) -> u64 {
        if let Some(existing_id) = self.cell_symbols.as_ref().unwrap().get(&cell_id) {
            *existing_id 
        } else {
            let symbol_id = self.next_pointer();
            self.cell_symbols.as_mut().unwrap().insert(cell_id, symbol_id);
            self.symbols_cell.as_mut().unwrap().insert(symbol_id, cell_id);
            symbol_id
        }
    }

    pub fn get_symbol(&self, name: String) -> Option<u64> {
        let name_upper = name.to_uppercase();
        let existing_val = self.normname_symbols.get(&name_upper);
        if existing_val.is_some() {
            return Some(*existing_val.unwrap());
        }
        return None;
    }

    // Symbol used in expression
    pub fn get_or_create_symbol(&mut self, name: String) -> u64 {
        let name_upper = name.to_uppercase();
        let existing_val = self.normname_symbols.get(&name_upper);
        if existing_val.is_some() {
            return *existing_val.unwrap();
        }

        let symbol_id = self.next_value_symbol();
        self.normname_symbols.insert(name_upper, symbol_id);
        self.symbols_name.insert(symbol_id, name);
        symbol_id
    }

    // Symbol used as cell names
    pub fn define_name(&mut self, trimmed_name: String, symbol: u64) -> Result<u64> {
        // TODO: Check name validity - no delimiter characters, doesn't start with :
        let name_upper = trimmed_name.to_uppercase();
        let existing_val = self.normname_symbols.get(&name_upper);
        if existing_val.is_some() {
            return Err(PARSE_ERR_USED_NAME);
        }
        
        self.normname_symbols.insert(name_upper, symbol);
        self.symbols_name.insert(symbol, trimmed_name);
        return Ok(symbol);
    }
}


#[derive(PartialEq,Clone)]
pub struct Expression {
    pub id: u64,        // Cell ID
    pub cell_symbol: u64,
    pub parsed: Vec<Atom>,
    pub depends_on: Vec<u64>,
    pub used_by: Vec<u64>,
    // Internal dependency counter used during ordering.
    pub unmet_depend_count: i32,
    pub result: Option<u64>
}

fn fmt_symbols_list(list: &Vec<u64>) -> String {
    let mut output = vec![];
    for item in list {
        output.push(format!("{:X}", item));
    }
    return output.join(",");
}


#[cfg(not(target_os = "unknown"))]
impl fmt::Debug for Expression {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        let mut parts = vec![];
        parts.push(String::from("Expression {\n"));
        parts.push(format!("\tid: {:#?}\n", self.id));
        parts.push(format!("\tcell_symbol: {:X}\n", self.cell_symbol));
        parts.push(format!("\tparsed: {:#?}\n", self.parsed));
        parts.push(format!("\tdepends_on: {} \n", fmt_symbols_list(&self.depends_on)));
        parts.push(format!("\tused_by: {}\n", fmt_symbols_list(&self.used_by)));
        parts.push(format!("\tunmet_depend_count: {:#?}\n", self.unmet_depend_count));
        if self.result.is_some() {
            parts.push(format!("\tresult: {:X}\n", self.result.unwrap()));
        }

        parts.push(String::from("}"));

        write!(f, "{}", parts.join(""))
    }
}


impl Expression {
    pub fn new(id: u64) -> Expression {
        return Expression {
            id: id,
            cell_symbol: 0,
            parsed: Vec::with_capacity(0), 
            depends_on: Vec::with_capacity(0),
            used_by: Vec::with_capacity(0),
            unmet_depend_count: 0,
            result: None
        }
    }

    pub fn err(id: u64, error: u64) -> Expression {
        let mut node = Expression::new(id);
        node.result = Some(error);
        return node;
    }

    pub fn set_result(&mut self, result: u64) {
        // Set result only if it wasn't previously set to avoid cloberring errors.
        if self.result.is_none() {
            self.result = Some(result);
        }
    }
}

