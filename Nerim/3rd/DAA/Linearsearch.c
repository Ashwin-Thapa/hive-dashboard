#include <stdio.h>

int i, loc, s;
int arr[] = {1, 2, 3, 4, 5, 6};
void main()
{
    printf("Enter element to search in the array: ");
    scanf("%d", &s);
    for (i = 0; i < 5; i++)
    {
        if (arr[i] == s)
        {
            loc = i + 1;
        }
    }
    printf("Element found in location %d ", loc);
}