import random
import sys

def solve_like_cpp(n, h):
    """
    Exact translation of your C++ Monotonic Stack logic to compute the right answer
    """
    res = 0
    s = []
    
    # Left to right pass
    for i in range(1, n + 1):
        while s and h[s[-1]] < h[i]:
            s.pop()
        if s:
            res += i - s[-1] + 1
        s.append(i)
        
    s = []
    # Right to left pass
    for i in range(n, 0, -1):
        while s and h[s[-1]] < h[i]:
            s.pop()
        if s:
            res += s[-1] - i + 1
        s.append(i)
        
    return res

def generate_test_case(test_name, n, min_val=1, max_val=60):
    # Padding with a 0 at the start so we can 1-index it like the C++ code
    h = [0] + [random.randint(min_val, max_val) for _ in range(n)]
    
    # Run the solution to compute expected output
    expected_output = solve_like_cpp(n, h)
    
    # 1. Write the input file
    input_filename = f"{test_name}_in.txt"
    with open(input_filename, "w") as f:
        f.write(f"{n}\n")
        f.write(" ".join(map(str, h[1:])) + "\n")
        
    # 2. Write the expected output file
    output_filename = f"{test_name}_out.txt"
    with open(output_filename, "w") as f:
        f.write(f"{expected_output}\n")
        
    print(f"Successfully generated {test_name}: N={n}, Output={expected_output}")

if __name__ == "__main__":
    print("Generating Test Cases...")
    
    # Generate exactly ONE large test case
    generate_test_case("tc_large", n=100000, max_val=100)
