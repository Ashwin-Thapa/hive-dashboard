#Program to perform arithmetic operation

num1 = int(input("Enter the first number: "))
num2 = int(input("Enter the second number: "))
operation = input("Enter operation: \n '+', '-', '/', '*', '%': \n")

if operation == '+':
    print("Output is ", num1 + num2)
elif operation == '-':
    print("Output is ", num1 - num2)
elif operation == '*':
    print("Output is ", num1 * num2)
elif operation == '/':
    print("Output is ", num1 / num2)
elif operation == '%':
    print("Output is ", num1 % num2)
    
