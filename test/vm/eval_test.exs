defmodule EvalTest do
  use ExUnit.Case
  doctest VM

  test "eval arithmetic" do
    # assert VM.eval_expr("= 1 + 1") == 2
    # assert VM.eval_expr("= 23 + 19") == 42
    # assert VM.eval_expr("= 3 + 4 * 5") == 23
    # assert VM.eval_expr("= (3 + 4) * 5") == 35
    # assert VM.eval_expr("= (3 + 4) * -10") == -70
    # assert VM.eval_expr("= (3.5 + 4) * -10") == -75.0
    # assert VM.eval_expr("= (-.5 + 4) * 10") == 35.0
    expr = %{
      "left" => %{"raw" => "1", "type" => "Literal", "value" => 1},
      "operator" => "+",
      "right" => %{"raw" => "1", "type" => "Literal", "value" => 1},
      "type" => "BinaryExpression"
    }
    assert VM.eval_expr(expr) == 2
  end


  test "unary negative" do
    # 1 + 5 * -3
    expr = %{
      "left" => %{"raw" => "1", "type" => "Literal", "value" => 1},
      "operator" => "+",
      "right" => %{
        "left" => %{"raw" => "5", "type" => "Literal", "value" => 5},
        "operator" => "*",
        "right" => %{
          "argument" => %{"raw" => "3", "type" => "Literal", "value" => 3},
          "operator" => "-",
          "prefix" => true,
          "type" => "UnaryExpression"
        },
        "type" => "BinaryExpression"
      },
      "type" => "BinaryExpression"
    }

    assert VM.eval_expr(expr) == -14

  end

  test "bool equality check" do
    # 1 + 1 is 2
    expr = %{
      "left" => %{
        "left" => %{"raw" => "1", "type" => "Literal", "value" => 1},
        "operator" => "+",
        "right" => %{"raw" => "1", "type" => "Literal", "value" => 1},
        "type" => "BinaryExpression"
      },
      "operator" => "is",
      "right" => %{"raw" => "2", "type" => "Literal", "value" => 2},
      "type" => "BinaryExpression"
    }

    assert VM.eval_expr(expr) == true
  end

end
