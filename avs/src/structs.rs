use core::cell::RefCell;
use alloc::rc::Rc;
use crate::{__repr_pointer, __unwrap_pointer};
use crate::constants::*;

#[derive(Debug,PartialEq)]
pub enum ValueType {
    NoneType, 
    BooleanType,
    NumericType,
    StringType,
	PointerType,
	ErrorType
}

// #[derive(Debug,PartialEq)]
// pub enum AvObjectType {
//     AvObject,
//     AvString,
//     AvEnvironment,
//     // AvClass, AvFunction
// }

// 4 byte class ID.
// No other hash or ID fields for now.
pub struct AvObjectBasic {
    pub avclass: u32
    // ID: u32? 
}

pub struct AvClass {
    pub object: AvObjectBasic,
    pub values_size: u32,
    pub objs_size: u32,
    // TODO: Methods stored in class
}

pub struct AvObject {
    pub object: AvObjectBasic,
    // Values are required. Objects are optional. (unallocated for primitive arrays)
    pub values: RefCell<Vec<u64>>,
    pub avobjs: RefCell<Option<Vec<Rc<AvObject>>>>
}

pub struct AvObjectString {
    pub object: AvObjectBasic,
    pub avstr: str   // ToDo String vs str
}

pub struct AvObjectArray {
    pub object: AvObject,
}

// TODO: AvBytes

// Matches with the IO object format. The fields present vary based on object type.
#[derive(Debug,PartialEq)]
pub struct AvObject {
    pub avtype: AvObjectType,
    pub avclass: u32,
    pub avhash: u64,
    pub length: u32,
    pub values: RefCell<Option<Vec<u64>>>,
    pub avstr: Option<String>,     // TOXO: &str vs str vs String
    pub avbytes: RefCell<Option<Vec<u8>>>,
    // Immutable list of reference counted interior mutable cells
    // RC was required for get_object.
    pub avobjs: RefCell<Option<Vec<Rc<AvObject>>>>
}

impl AvObject {
    pub fn new_env() -> AvObject {
        let mut results: Vec<u64> = Vec::new();
        let mut obj_vec: Vec<Rc<AvObject>> = Vec::new();

        return AvObject {
            avtype: AvObjectType::AvEnvironment,
            avclass: 0,
            avhash: 0,
            length: 0,
            values: RefCell::new(Some(results)),
            avstr: None, 
            avbytes: RefCell::new(None), 
            avobjs: RefCell::new(Some(obj_vec))
        };
    }

    pub fn new_string(value: String) -> AvObject {
        return AvObject {
            avtype: AvObjectType::AvString,
            avclass: 0,
            avhash: 0,
            length: 0,
            values: RefCell::new(None),
            avstr: Some(value),
            avbytes: RefCell::new(None), 
            avobjs: RefCell::new(None)
        };
    }

    pub fn new() -> AvObject {
        // Allocate an empty object
        return AvObject {
            avtype: AvObjectType::AvObject,
            avclass: 0,
            avhash: 0,
            length: 0,
            values: RefCell::new(None),
            avstr: None,
            avbytes: RefCell::new(None), 
            avobjs: RefCell::new(None)
        };
    }

    pub fn resize_values(&mut self, new_len: usize) {
        // Since results are often saved out of order, pre-reserve space
        let mut values = self.values.borrow_mut();
        if values.is_some() {
            values.as_mut().unwrap().resize(new_len, 0);
        }
    }

    pub fn save_value(&mut self, index: usize, value: u64) {
        let mut values = self.values.borrow_mut();
        if values.is_some() {
            // TODO: Resize?
            values.as_mut().unwrap()[index] = value;
        }
    }

    pub fn get_value(&mut self, index: usize) -> u64 {
        let values = self.values.borrow();
        return values.as_ref().unwrap()[index];
    }

    pub fn save_object(&mut self, obj: AvObject) -> u64 {
        // Save an object into this object's "heap" and return pointer to index.
        let mut objects = self.avobjs.borrow_mut();
        // Assertion - this has a heap.
        if objects.is_some() {
            let obj_arr = objects.as_mut().unwrap();
            obj_arr.push(Rc::new(obj));
            let index = obj_arr.len() - 1;
            return __repr_pointer(index);
        }
        // TODO: stack trace for this
        return RUNTIME_ERR_MEMORY_ACCESS;
    }
    
    pub fn get_object(&self, ptr: u64) -> Rc<AvObject> {
        let index = __unwrap_pointer(ptr);

        let objects = self.avobjs.borrow();
        let obj_arr = objects.as_ref().unwrap();
        return Rc::clone(&obj_arr[index])
    }

}
