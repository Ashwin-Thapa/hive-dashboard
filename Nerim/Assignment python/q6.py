#Program to create list using user input and sorting list in ascending order

L = []
no_of_elements = int(input("How many elements do you want to add in the list? "))

for i in range(no_of_elements):
    num = int(input("Enter element: "))
    L.append(num)
    L.sort()

print("The sorted list is",L)
