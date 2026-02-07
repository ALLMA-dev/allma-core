import { Loader, Center } from '@mantine/core';

export function PageLoader() {
  return (
    <Center style={{ height: '80vh' }}>
      <Loader />
    </Center>
  );
}