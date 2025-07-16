#Program to print the fibonacci series

x = int(input("How many fibonbacci numbers do you want? "))
fibonacci = [0,1]
print("\nFibonacci series upto",x,"numbers are: ")

for i in range(1,x):
    nex = fibonacci[i-1] + fibonacci[i]
    fibonacci.append(nex)
    
print(fibonacci)
