import type { UseQueryResult } from '@tanstack/react-query';
import { router, type Href } from 'expo-router';
import { Fragment, useDeferredValue, useState } from 'react';
import { ActivityIndicator } from 'react-native';

import { errorMessage, type Page } from '@/api/client';
import { Screen } from '@/components/screen';
import { Text } from '@/components/text';
import { Badge, Card, ErrorBanner, IconButton, ListRow, Notice, SearchField, Separator } from '@/components/ui';
import { colors, space } from '@/theme/tokens';

type Item = { id: string; name: string; active: boolean };

type Props<T extends Item> = {
  title: string;
  subtitle: string;
  noun: string;
  plural: string;
  useList: (search: string) => UseQueryResult<Page<T>>;
  describe: (item: T) => string | undefined;
  addHref: Href;
  itemHref: (item: T) => Href;
  note: string;
  emptyText: string;
  /** Hide the back button when the list is a tab. */
  isTab?: boolean;
};

/** Searchable list of a master-data resource with Active/Inactive badges (Products, Suppliers, …). */
export function MasterList<T extends Item>(p: Props<T>) {
  const [search, setSearch] = useState('');
  const deferred = useDeferredValue(search);
  const query = p.useList(deferred);
  const items = query.data?.content ?? [];

  return (
    <Screen
      title={p.title}
      subtitle={p.subtitle}
      left={p.isTab ? <></> : <IconButton icon="chevron-left" label="Back" onPress={() => router.back()} />}
      right={<IconButton icon="plus" label={`Add ${p.noun}`} filled onPress={() => router.push(p.addHref)} />}>
      <SearchField
        placeholder={`Search ${p.plural}`}
        accessibilityLabel={`Search ${p.plural}`}
        value={search}
        onChangeText={setSearch}
      />

      {query.isError ? <ErrorBanner message={errorMessage(query.error)} onRetry={query.refetch} /> : null}

      {query.isPending ? (
        <ActivityIndicator color={colors.accent} />
      ) : items.length ? (
        <>
          <Card>
            {items.map((item, i) => (
              <Fragment key={item.id}>
                {i > 0 ? <Separator /> : null}
                <ListRow
                  title={item.name}
                  subtitle={p.describe(item)}
                  muted={!item.active}
                  right={
                    <Badge label={item.active ? 'Active' : 'Inactive'} tone={item.active ? 'success' : 'danger'} />
                  }
                  onPress={() => router.push(p.itemHref(item))}
                />
              </Fragment>
            ))}
          </Card>
          <Notice text={p.note} />
        </>
      ) : query.isSuccess ? (
        <Card style={{ padding: space.xl, alignItems: 'center', gap: space.sm }}>
          <Text variant="bodyMedium">{deferred ? 'No matches' : `No ${p.plural} yet`}</Text>
          <Text variant="caption" style={{ textAlign: 'center' }}>
            {deferred ? 'Try another name.' : p.emptyText}
          </Text>
        </Card>
      ) : null}
    </Screen>
  );
}
