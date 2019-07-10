/* 
Values in Arevel are nan-boxed. 
Floating point representation of NaN leaves a lot of bits unused. 
We pack a type and value into this space, for basic types and pointers.

0 00000001010 0000000000000000000000000000000000000000000000000000 = 64
1 11111111111 1000000000000000000000000000000000000000000000000000 = nan

Type (3 bits):
1(000) - Pointer (Highest priority & fastest to check)
1(001) - None
1(010) - Boolean - Val for True & False
1(110) - Error - operation resulted in an error. Code in lower bits.
Integers stored as doubles.

*/

#[no_mangle]
pub extern "C" fn is_nan(f: f64) -> bool {
    // By definition, any comparison with a nan returns 0. 
    // So NaNs can be identified with a self comparison.
    return f != f
}

// 8 = 1000
const SIGNALING_NAN: u64 = 0xFFF8_0000_0000_0000;
const QUITE_NAN: u64 = 0xFFF0_0000_0000_0000;

const VALUE_TYPE_POINTER: u64 = 0xFFF9_0000_0000_0000;
const VALUE_TYPE_NONE: u64 = 0xFFFA_0000_0000_0000;
const VALUE_TYPE_BOOL: u64 = 0xFFFB_0000_0000_0000;
// Unused...
const VALUE_TYPE_ERR: u64 = 0xFFFE_0000_0000_0000;

// NaN-boxed boolean. 0xFFFB = Boolean type header.
pub const TRUE_VAL: u64 = 0xFFFB_0000_0000_0001;
pub const FALSE_VAL: u64 = 0xFFFB_0000_0000_0000;


// TODO: Type checking
#[no_mangle]
pub extern "C" fn __av_add(a: u64, b: u64) -> u64 {
	let f_a = f64::from_bits(a);
	let f_b = f64::from_bits(b);
	return (f_a + f_b).to_bits()
}

#[no_mangle]
pub extern "C" fn __av_sub(a: u64, b: u64) -> u64 {
	let f_a = f64::from_bits(a);
	let f_b = f64::from_bits(b);
	return (f_a - f_b).to_bits()
}

#[no_mangle]
pub extern "C" fn __av_mul(a: u64, b: u64) -> u64 {
	let f_a = f64::from_bits(a);
	let f_b = f64::from_bits(b);
	return (f_a * f_b).to_bits()
}

#[no_mangle]
pub extern "C" fn __av_div(a: u64, b: u64) -> u64 {
	let f_a = f64::from_bits(a);
	let f_b = f64::from_bits(b);
	return (f_a / f_b).to_bits()
}

#[no_mangle]
pub extern "C" fn __av_as_bool(a: u64) -> bool {
	// TODO: More advanced type checking.
	if a == TRUE_VAL {
		return true
	}
	if a == FALSE_VAL {
		return false;
	}
	// Truthiness for other empty types and errors.
	// todo: verify this doesn't happen
	return false;
}

pub extern "C" fn __repr_bool(a: bool) -> u64 {
	if a {
		return TRUE_VAL
	} 
	else {
		return FALSE_VAL
	}
}

#[no_mangle]
pub extern "C" fn __av_and(a: u64, b: u64) -> u64 {
	let a_bool: bool = __av_as_bool(a);
	let b_bool: bool = __av_as_bool(b);
	let result: bool = a_bool && b_bool;
	return __repr_bool(result);
}

#[no_mangle]
pub extern "C" fn __av_or(a: u64, b: u64) -> u64 {
	let a_bool: bool = __av_as_bool(a);
	let b_bool: bool = __av_as_bool(b);
	let result: bool = a_bool || b_bool;
	return __repr_bool(result);
}

#[no_mangle]
pub extern "C" fn __av_not(a: u64) -> u64 {
	let a_bool: bool = __av_as_bool(a);
	let result: bool = !a_bool;
	return __repr_bool(result);
}

#[no_mangle]
pub extern "C" fn _start() -> u64 {
	0
}
