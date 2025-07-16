#Program to create a dictionary where key will be radius of circle and value will be area of the corressponding area

def user_input():
    key = int(input("Enter radius of a circle: "))
    D[key] = round(2*3.14*key)

D = {}
add_more = True

user_input()

while add_more:
    user_choice = input("'y' to add more or 'n' to view dictionary: ").lower()
    if user_choice == 'y':
        user_input()
    else:
        add_more = False


print("The Dictionary is ",D)
