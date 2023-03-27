const std = @import("std");
const val = @import("value.zig");
const tok = @import("token.zig");
const lex = @import("lexer.zig");
const ArrayList = std.ArrayList;
const Allocator = std.mem.Allocator;
const print = std.debug.print;

// An abstract key-value pair.
const Form = struct { head: u64, body: u64 };

fn formPointer(index: u64, length: u64) u64 {
    return val.createPrimitiveArray(@truncate(u29, index), @truncate(u19, length));
}

pub const Parser = struct {
    const Self = @This();
    allocator: Allocator,
    index: u32,
    lexer: lex.Lexer,
    forms: ArrayList(Form),

    pub fn init(allocator: Allocator, lexer: lex.Lexer) Self {
        return Self{
            .allocator = allocator,
            .index = 0,
            .lexer = lexer,
            .forms = ArrayList(Form).init(allocator),
        };
    }

    pub fn deinit(self: *Parser) void {
        self.forms.deinit();
    }

    pub fn parse(self: *Self, end_token: u64) !u64 {
        var currentForm = ArrayList(Form).init(self.allocator);
        defer currentForm.deinit();
        var head: ?u64 = null;
        var current: ?u64 = null;
        while (self.index < self.lexer.tokens.items.len) {
            const token = self.lexer.tokens.items[self.index];
            self.index += 1;
            _ = switch (token) {
                // Leading indentation or inline open brace.
                tok.SYMBOL_INDENT => {
                    // Begin a new sub-map. Recurse.
                    current = try self.parse(tok.SYMBOL_DEDENT);
                },
                tok.SYMBOL_OPEN_BRACE => {
                    // Equivalent to indent, just less ambiguous for nested blocks.
                    current = try self.parse(tok.SYMBOL_DEDENT);
                },
                tok.SYMBOL_NEWLINE, tok.SYMBOL_COMMA => {
                    // Begin new block.
                    // Or end of expression.
                    // End current form. Insert into map.
                    if (head != null and current != null) {
                        try currentForm.append(Form{ .head = head.?, .body = current.? });
                        head = null;
                        current = null;
                    } else {
                        print("Syntax error: Expected head and body.", .{});
                    }
                },
                tok.SYMBOL_COLON => {
                    // End key portion. Current buffer will now collect body.
                    head = current;
                    current = null;
                },
                tok.SYMBOL_EQUALS => {
                    // x = y = z
                    if (current != null) {
                        // No "= x" without a head.
                        // In a pure context, that's meaningless and can be dropped.

                        // This is equivalent of calling a sub-parse and appending it.
                        // TODO: Double-check the scoping rules here.
                        var remaining = try self.parse(tok.SYMBOL_NEWLINE);
                        var subBody = Form{ .head = current.?, .body = remaining };
                        var idx = formPointer(self.forms.items.len, 1);
                        try self.forms.append(subBody);
                        try currentForm.append(Form{ .head = tok.SYMBOL_EQUALS, .body = idx });
                        current = idx;
                    } else {
                        print("Syntax error. Expected head before =.", .{});
                    }
                },
                else => {
                    if (token == end_token) {
                        // Ending token depending on the beginning token.
                        // tok.SYMBOL_DEDENT, tok.SYMBOL_CLOSE_BRACE
                        // End entire map. Insert and return.
                        break;
                    }
                    current = token;
                },
                // If ( => : { and recurse.
                // Otherwise - it's part of the current key / value.
            };
        }

        if (head != null and current != null) {
            try currentForm.append(Form{ .head = head.?, .body = current.? });
        } else {
            print("Syntax error. No complete form by end.", .{});
        }

        // End of current map with the end of the current {block} or end of stream.
        var index = self.forms.items.len;
        for (currentForm.items) |form| {
            try self.forms.append(form);
        }

        return formPointer(index, currentForm.items.len);
    }
};

const test_allocator = std.testing.allocator;
const arena_allocator = std.heap.ArenaAllocator;
const expect = std.testing.expect;

fn testFormEquals(form: Form, expected: Form) !void {
    try expect(form.head == expected.head);
    try expect(form.body == expected.body);
}

fn testParse(buffer: []const u8, expected: []const Form) !void {
    var lexer = lex.Lexer.init(buffer, test_allocator);
    defer lexer.deinit();
    _ = try lexer.lex(0, 0);
    var parser = Parser.init(test_allocator, lexer);
    defer parser.deinit();
    var result = try parser.parse(tok.SYMBOL_STREAM_END);
    _ = result;
    try expect(parser.forms.items.len == expected.len);

    for (parser.forms.items, 0..) |form, i| {
        print("\nForm:     ({x} {x})\n", .{ form.head, form.body });
        print("Expected: ({x} {x})\n", .{ expected[i].head, expected[i].body });
        try testFormEquals(form, expected[i]);
    }
}
// a :
//  b : c
// a :
// { c : d } : {e : f}
test "parser.Test parse map" {
    var source = "a: b";
    const expected = [_]Form{
        Form{ .head = val.createObject(tok.T_IDENTIFIER, 0, 1), .body = val.createObject(tok.T_IDENTIFIER, 3, 1) },
    };

    try testParse(source, &expected);
}
