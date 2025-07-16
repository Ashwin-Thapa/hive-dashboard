#include <stdio.h>

int arr[] = {1, 2, 3, 4, 5, 6};
int mid, beg = 0, end = 5, i, s, loc;

void main()
{
    printf("Enter element to search: ");
    scanf("%d", &s);
    mid = (beg + end) / 2;
    while (beg <= end)
    {
        if (arr[mid] == s)
        {
            loc = mid;
            printf("Element present in Location %d", loc + 1);
            break;
        }
        else if (arr[mid] < s)
        {
            beg = mid + 1;
            mid = (beg + end) / 2;
        }
        else
        {
            end = mid - 1;
            mid = (beg + end) / 2;
        }
        if (beg > end)
        {
            printf("Element not present in the array.");
        }
    }
}