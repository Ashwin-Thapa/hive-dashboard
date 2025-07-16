#Program to find the sum of even numbers for the given range

length = int(input("Enter a range: "))
addition = 0
for i in range(length+1):
    if (i%2 == 0):
        addition = i + addition
        print("+",i)

print("____")
print("=",addition)
