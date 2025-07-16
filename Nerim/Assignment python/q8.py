#Program to remove odd numbers from a list

L = [1,2,3,4,5,6,7,8,9,10,11,12,14,15,17,19,16,18,20]

odd_num = [i for i in L if i%2 != 0]

print(odd_num)
