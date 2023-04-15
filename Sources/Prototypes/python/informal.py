from mlirgen import *

class Type:
    def match(self):
        return self

    def repr(self, indent=0):
        prefix = '\n' + ('\t' * indent)
        return prefix + self.__class__.__name__


class CompoundType(Type):
    def __init__(self, *options):
        super().__init__()
        self.options = options
        self.value = []
        self.rest = ""

    def repr(self, indent=0):
        prefix = '\n' + ('\t' * indent)
        return prefix + self.__class__.__name__ + "()"


class LiteralType(Type):
    def __init__(self, value):
        super().__init__()
        self.value = value
        self.rest = ""

    def match(self, input_):
        if len(input_) > 0 and self.value == input_[0]:
            self.rest = input_[1:]
            return self
        else:
            return None

    def repr(self, indent=0):
        prefix = '\n' + ('\t' * indent)
        return f"{prefix}Literal({self.value})"


class Intersection(CompoundType):
    def match(self, input_):
        values = []
        for option in self.options:
            result = match(input_, option)
            if not result:
                return None
            values.append(result)
        self.values = values
        # self.rest = input_[1:]
        self.rest = values[-1].rest
        return self

    def repr(self, indent=0):
        last_val = self.values[-1]
        prefix = '\n' + ('\t' * indent)
        return f"{prefix}Intersection({prefix}{ last_val.repr(indent+1) if isinstance(last_val, Type) else last_val})"
    
    def emit(self, ctx):
        result = self.values[-1].emit(ctx)
        return result



class Choice(CompoundType):
    def match(self, input_):
        for option in self.options:
            result = match(input_, option)
            if result:
                self.rest = input_[1:]
                return result
        return None


class Structure(CompoundType):
    def match(self, input_):
        self.rest = input_
        values = []
        for option in self.options:
            result = match(self.rest, option)
            if not result:
                return None
            values.append(result)
            self.rest = result.rest
        self.values = values
        return self

    def repr(self, indent=0):
        # return f"Structure{{{'; '.join([v.repr() if isinstance(v, Type) else v for v in self.values])}}}"
        # Print this indented as a tree
        prefix = '\n' + ('\t' * indent)
        return f"{prefix}Structure{{{ prefix.join([v.repr(indent + 1) if isinstance(v, Type) else (prefix + v) for v in self.values])}}}"
    
    def emit(self, ctx):
        result = None
        for val in self.values:
            result = val.emit(ctx)
        return result

def match(input_, type_):
    if isinstance(type_, Type):
        return type_.match(input_)
    elif isinstance(type_, bool):
        return input_ if type_ else None
    elif callable(type_):
        return match(input_, type_(input_))
    else:
        raise ValueError(f"Unknown type: {type(type_)}")


def precedence_gte(node_bp, context_bp):
    return node_bp >= context_bp


def precedence_gt(node_bp, context_bp):
    return node_bp > context_bp


class DependentNode(Type):
    def __init__(self, binding_power):
        super().__init__()
        self.binding_power = binding_power
        self.rest = ""
        self.result = None

    def match(self, input_):
        self.result = self.option.match(input_)
        if self.result:
            self.rest = self.result.rest
            return self
        else:
            return None

    def repr(self, indent=0):
        prefix = '\n' + ('\t' * indent)
        return prefix + self.__class__.__name__ + " " + self.result.repr(indent+1)
    
    def emit(self, ctx):
        return self.result.emit(ctx)


class BinaryOp(DependentNode):
    op = None
    op_binding_power = None

    def __init__(self, binding_power):
        super().__init__(binding_power)
        self.option = Structure(
            Intersection(lambda x: precedence_gt(self.op_binding_power, binding_power), Expr(self.op_binding_power)),
            LiteralType(self.op),
            Intersection(lambda x: precedence_gte(self.op_binding_power, binding_power), Expr(self.op_binding_power)),
        )


class AddNode(BinaryOp):
    op = "+"
    op_binding_power = 10

    def emit(self, ctx):
        lhs = self.result.values[0].emit(ctx)
        rhs = self.result.values[2].emit(ctx)
        op = Op(ctx)
        return op.create(
            ctx, "llvm.add", result=i32, operands=[lhs, rhs])


class MultiplyNode(BinaryOp):
    op = "*"
    op_binding_power = 20


class NumericLiteral(Type):
    def match(self, input_):
        if len(input_) > 0 and input_[0].isdigit():
            self.value = input_[0]
            self.rest = input_[1:]
            return self
        else:
            return None
    
    def repr(self, indent=0):
        prefix = '\n' + ('\t' * indent)
        return f"{prefix}NumericLiteral({self.value})"
    
    def emit(self, ctx):
        return Constant(ctx, int(self.value), i32).code()

class Expr(DependentNode):
    def __init__(self, binding_power):
        super().__init__(binding_power)
        self.binding_power = binding_power
        # Don't initialize options here to prevent recursion. 
        # In the proper version, the types are chained - so the initial condition can short-circut the other
        # type checks and acts like a base-case to prevent infinite recursion.

    def match(self, input):
        self.option = Choice(
            AddNode(self.binding_power),
            MultiplyNode(self.binding_power),
            NumericLiteral()
        )
        self.result = match(input, self.option)
        if self.result:
            self.rest = self.result.rest
            return self
        else:
            return None
        
    def emit(self, ctx):
        return self.result.emit(ctx)
                

def parse(input_):
    tokens = input_.split(" ")
    base = Expr(0)
    result = match(tokens, base)
    # TODO: Need to wrap this in a Many() to ensure the full expression is parsed.
    return result


def gen_hello_world_mlir():
    print("Input")

    ctx = CodeBuffer()
    with Module(ctx) as module:
        terminator = '\\0A\\00'
        message = """Hello World! Today is April %d"""
        # Message length + 2 byte terminator length.
        input_type = f'!llvm.ptr<array<{len(message) + 2} x i8>>'
        module.line(f'llvm.mlir.global internal constant @str("{message + terminator}")')
        module.builtin_printf.code(module)
        with Main(ctx) as main:
            l0 = Pointer(main,"str", input_type).code()
            l1 = Constant(main, 0, "index", i32).code()
            l2 = ElementIndex(main, l0, l1, l1, input_type).code()
            const_out = Constant(main, 14, i32).code()
            l3 = module.builtin_printf.overload_call(main, ["!llvm.ptr<i8>", i32], [l2, const_out])
            l4 = Constant(main, 0, i32).code()
            main.line(f"llvm.return {l4} : i32")

    print(ctx.code)



def gen_mlir(expr):
    # To get visibility into running results
    # This first version will rely on C-libraries to do things like
    # digit to char. Or printf.
    # The code automatically runs in main and will print the result.
    ctx = CodeBuffer()
    with Module(ctx) as module:
        terminator = '\\0A\\00'
        message = """%d"""
        # Message length + 2 byte terminator length.
        input_type = f'!llvm.ptr<array<{len(message) + 2} x i8>>'
        module.line(f'llvm.mlir.global internal constant @str("{message + terminator}")')
        module.builtin_printf.code(module)
        with Main(ctx) as main:
            l0 = Pointer(main,"str", input_type).code()
            l1 = Constant(main, 0, "index", i32).code()
            l2 = ElementIndex(main, l0, l1, l1, input_type).code()
            expr_result = expr.emit(main)
            l3 = module.builtin_printf.overload_call(main, ["!llvm.ptr<i8>", i32], [l2, expr_result])
            l4 = Constant(main, 0, i32).code()
            main.line(f"llvm.return {l4} : i32")
    print(ctx.code)


from pprint import pprint
# parse("1 + 2 * 3")
result = parse("1 + 1")
# print(result.repr())
gen_mlir(result)
# gen_hello_world_mlir()
